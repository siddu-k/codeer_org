import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export interface Problem {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    tags: string[];
    time_limit: number;
    memory_limit: number;
    boilerplate_code: string;
    solution?: string;
    hints: string[];
    marks: number;
    total_submissions: number;
    total_accepted: number;
    acceptance_rate: number;
    examples: Array<{
        input: string;
        expected_output: string;
        explanation: string;
        is_hidden: boolean;
    }>;
    created_by?: {
        id: string;
        display_name: string;
        github_username?: string;
    };
    createdAt: Date;
    user_status?: {
        status: 'unattempted' | 'attempted' | 'solved' | 'viewed_solution';
        xp_earned: number;
        attempts_count: number;
        best_runtime?: number;
        best_memory?: number;
    };
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userEmail = session?.user?.email;

        // Get user ID if authenticated
        let userId = null;
        if (userEmail) {
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('email', userEmail)
                .single();
            userId = user?.id;
        }

        // Fetch problems from Supabase with test cases and user status
        let query = supabase
            .from('problems')
            .select(`
                *,
                created_by:users!created_by_user_id(id, display_name, github_username),
                test_cases:problem_test_cases(
                    id,
                    input,
                    expected_output,
                    explanation,
                    is_hidden,
                    order_index
                )
            `)
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        const { data: problems, error } = await query;

        if (error) {
            console.error('Error fetching problems:', error);
            return NextResponse.json({ error: 'Failed to fetch problems' }, { status: 500 });
        }

        // Get user status for each problem if user is authenticated
        let userStatuses: any[] = [];
        if (userId) {
            const { data: statuses } = await supabase
                .from('user_problem_status')
                .select('*')
                .eq('user_id', userId);
            userStatuses = statuses || [];
        }

        // Format problems for frontend
        const formattedProblems: Problem[] = (problems || []).map(problem => {
            const userStatus = userStatuses.find(status => status.problem_id === problem.id);
            
            // Only include non-hidden test cases for examples
            const publicTestCases = (problem.test_cases || [])
                .filter((tc: any) => !tc.is_hidden)
                .sort((a: any, b: any) => a.order_index - b.order_index);

            return {
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
                examples: publicTestCases.map((tc: any) => ({
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
        });

        return NextResponse.json(formattedProblems);
    } catch (error) {
        console.error('Error loading problems:', error);
        return NextResponse.json({ error: 'Failed to load problems' }, { status: 500 });
    }
}
