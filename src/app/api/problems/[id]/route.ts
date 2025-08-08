import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const problemId = params.id;

        // Get user ID if authenticated
        let userId = null;
        if (session?.user?.email) {
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('email', session.user.email)
                .single();
            userId = user?.id;
        }

        // Fetch problem with test cases
        const { data: problem, error } = await supabase
            .from('problems')
            .select(`
                *,
                created_by:users!created_by_user_id(id, display_name, github_username),
                test_cases:problem_test_cases(*)
            `)
            .eq('id', problemId)
            .eq('status', 'published')
            .single();

        if (error || !problem) {
            return NextResponse.json(
                { error: 'Problem not found' },
                { status: 404 }
            );
        }

        // Get user status for this problem if authenticated
        let userStatus = null;
        if (userId) {
            const { data: status } = await supabase
                .from('user_problem_status')
                .select('*')
                .eq('user_id', userId)
                .eq('problem_id', problemId)
                .single();
            userStatus = status;
        }

        // Filter test cases (only show public ones unless user has solved the problem)
        const canSeeHiddenTests = userStatus?.status === 'solved';
        const filteredTestCases = problem.test_cases.filter((tc: any) => 
            !tc.is_hidden || canSeeHiddenTests
        );

        const formattedProblem = {
            id: problem.id,
            title: problem.title,
            description: problem.description,
            difficulty: problem.difficulty,
            category: problem.category,
            tags: problem.tags || [],
            time_limit: problem.time_limit,
            memory_limit: problem.memory_limit,
            boilerplate_code: problem.boilerplate_code || '',
            solution: problem.solution,
            hints: problem.hints || [],
            marks: problem.marks,
            total_submissions: problem.total_submissions,
            total_accepted: problem.total_accepted,
            acceptance_rate: problem.acceptance_rate,
            examples: filteredTestCases
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map((tc: any) => ({
                    input: tc.input,
                    expected_output: tc.expected_output,
                    explanation: tc.explanation || '',
                    is_hidden: tc.is_hidden
                })),
            created_by: problem.created_by ? {
                id: problem.created_by.id,
                display_name: problem.created_by.display_name,
                github_username: problem.created_by.github_username
            } : undefined,
            createdAt: new Date(problem.created_at),
            user_status: userStatus ? {
                status: userStatus.status,
                xp_earned: userStatus.xp_earned,
                attempts_count: userStatus.attempts_count,
                best_runtime: userStatus.best_runtime,
                best_memory: userStatus.best_memory
            } : undefined
        };

        return NextResponse.json(formattedProblem);

    } catch (error) {
        console.error('Error fetching problem:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}