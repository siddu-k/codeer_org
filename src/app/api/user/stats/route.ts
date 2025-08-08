import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Get user ID and basic stats
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get problem solving stats by difficulty
        const { data: difficultyStats, error: difficultyError } = await supabase
            .from('user_problem_status')
            .select(`
                problems!inner(difficulty),
                status
            `)
            .eq('user_id', user.id)
            .eq('status', 'solved');

        if (difficultyError) {
            console.error('Error fetching difficulty stats:', difficultyError);
        }

        // Calculate difficulty breakdown
        const difficultyBreakdown = {
            easy: 0,
            medium: 0,
            hard: 0
        };

        (difficultyStats || []).forEach((stat: any) => {
            const difficulty = stat.problems.difficulty;
            if (difficulty in difficultyBreakdown) {
                difficultyBreakdown[difficulty as keyof typeof difficultyBreakdown]++;
            }
        });

        // Get recent submissions
        const { data: recentSubmissions, error: submissionsError } = await supabase
            .from('submissions')
            .select(`
                *,
                problems(title, difficulty)
            `)
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false })
            .limit(10);

        if (submissionsError) {
            console.error('Error fetching recent submissions:', submissionsError);
        }

        // Get total problems count for completion percentage
        const { count: totalProblems } = await supabase
            .from('problems')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published');

        const completionPercentage = totalProblems > 0 
            ? Math.round((user.problems_solved / totalProblems) * 100)
            : 0;

        return NextResponse.json({
            success: true,
            stats: {
                total_xp: user.total_xp,
                problems_solved: user.problems_solved,
                current_streak: user.current_streak,
                max_streak: user.max_streak,
                last_solved_at: user.last_solved_at,
                completion_percentage: completionPercentage,
                difficulty_breakdown: difficultyBreakdown,
                recent_submissions: (recentSubmissions || []).map(sub => ({
                    id: sub.id,
                    problem_title: sub.problems?.title,
                    problem_difficulty: sub.problems?.difficulty,
                    status: sub.status,
                    language: sub.language,
                    runtime: sub.runtime,
                    memory: sub.memory,
                    submitted_at: sub.submitted_at
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}