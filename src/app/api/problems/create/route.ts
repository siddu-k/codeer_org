import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            title,
            description,
            difficulty,
            category,
            tags,
            time_limit,
            memory_limit,
            boilerplate_code,
            solution,
            hints,
            test_cases
        } = body;

        // Validate required fields
        if (!title || !description || !difficulty || !category) {
            return NextResponse.json(
                { error: 'Missing required fields: title, description, difficulty, category' },
                { status: 400 }
            );
        }

        if (!test_cases || !Array.isArray(test_cases) || test_cases.length === 0) {
            return NextResponse.json(
                { error: 'At least one test case is required' },
                { status: 400 }
            );
        }

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

        // Calculate marks based on difficulty
        const difficultyMarks = {
            easy: 50,
            medium: 100,
            hard: 150
        };

        const marks = difficultyMarks[difficulty as keyof typeof difficultyMarks] || 50;

        // Create problem
        const { data: problem, error: problemError } = await supabase
            .from('problems')
            .insert({
                title,
                description,
                difficulty,
                category,
                tags: Array.isArray(tags) ? tags : [],
                time_limit: time_limit || 2000,
                memory_limit: memory_limit || 256,
                boilerplate_code: boilerplate_code || '',
                solution: solution || '',
                hints: Array.isArray(hints) ? hints : [],
                marks,
                created_by_user_id: user.id,
                status: 'published'
            })
            .select()
            .single();

        if (problemError) {
            console.error('Error creating problem:', problemError);
            return NextResponse.json(
                { error: 'Failed to create problem' },
                { status: 500 }
            );
        }

        // Create test cases
        const testCasesToInsert = test_cases.map((testCase: any, index: number) => ({
            problem_id: problem.id,
            input: testCase.input,
            expected_output: testCase.expected_output,
            is_hidden: testCase.is_hidden || false,
            explanation: testCase.explanation || '',
            order_index: index
        }));

        const { error: testCasesError } = await supabase
            .from('problem_test_cases')
            .insert(testCasesToInsert);

        if (testCasesError) {
            console.error('Error creating test cases:', testCasesError);
            // Try to clean up the problem if test cases failed
            await supabase
                .from('problems')
                .delete()
                .eq('id', problem.id);

            return NextResponse.json(
                { error: 'Failed to create test cases' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            problem: {
                id: problem.id,
                title: problem.title,
                difficulty: problem.difficulty,
                category: problem.category,
                marks: problem.marks
            }
        });

    } catch (error) {
        console.error('Error in problem creation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}