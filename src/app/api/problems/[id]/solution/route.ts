import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const problemId = params.id;

        // Get user ID
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get problem details
        const { data: problem, error: problemError } = await supabase
            .from('problems')
            .select('solution, marks')
            .eq('id', problemId)
            .single();

        if (problemError || !problem) {
            return NextResponse.json(
                { error: 'Problem not found' },
                { status: 404 }
            );
        }

        // Check current user status for this problem
        const { data: currentStatus } = await supabase
            .from('user_problem_status')
            .select('*')
            .eq('user_id', user.id)
            .eq('problem_id', problemId)
            .single();

        let xpPenalty = 0;

        if (!currentStatus) {
            // First time viewing solution - create status and apply penalty
            xpPenalty = Math.floor(problem.marks / 2);
            
            await supabase
                .from('user_problem_status')
                .insert({
                    user_id: user.id,
                    problem_id: problemId,
                    status: 'viewed_solution',
                    xp_earned: 0, // No XP earned yet, but penalty applied for future solving
                    attempts_count: 0
                });
        } else if (currentStatus.status === 'unattempted' || currentStatus.status === 'attempted') {
            // User hasn't solved it yet, apply penalty for viewing solution
            xpPenalty = Math.floor(problem.marks / 2);
            
            await supabase
                .from('user_problem_status')
                .update({
                    status: 'viewed_solution'
                })
                .eq('user_id', user.id)
                .eq('problem_id', problemId);
        }
        // If already solved or already viewed solution, no penalty

        return NextResponse.json({
            success: true,
            solution: problem.solution,
            xp_penalty: xpPenalty,
            message: xpPenalty > 0 
                ? `Viewing the solution will reduce your potential XP for this problem by ${xpPenalty} points.`
                : 'Solution unlocked!'
        });

    } catch (error) {
        console.error('Error fetching solution:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}