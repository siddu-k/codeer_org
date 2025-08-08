import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';

// Judge0 language IDs mapping
const LANGUAGE_IDS = {
    javascript: 63,
    python: 71,
    java: 62,
    cpp: 54,
    c: 50,
    csharp: 51,
    go: 60,
    rust: 73,
    typescript: 74
};

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
        const { problem_id, code, language } = body;

        if (!problem_id || !code || !language) {
            return NextResponse.json(
                { error: 'Missing required fields: problem_id, code, language' },
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

        // Get problem details and test cases
        const { data: problem, error: problemError } = await supabase
            .from('problems')
            .select(`
                *,
                test_cases:problem_test_cases(*)
            `)
            .eq('id', problem_id)
            .single();

        if (problemError || !problem) {
            return NextResponse.json(
                { error: 'Problem not found' },
                { status: 404 }
            );
        }

        // Get language ID for Judge0
        const languageId = LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS];
        if (!languageId) {
            return NextResponse.json(
                { error: 'Unsupported language' },
                { status: 400 }
            );
        }

        // Prepare submissions for Judge0 (one for each test case)
        const submissions = problem.test_cases.map((testCase: any) => ({
            source_code: code,
            language_id: languageId,
            stdin: testCase.input,
            expected_output: testCase.expected_output,
            cpu_time_limit: (problem.time_limit / 1000).toString(), // Convert ms to seconds
            memory_limit: (problem.memory_limit * 1024).toString(), // Convert MB to KB
        }));

        console.log('Submitting to Judge0:', {
            judge0Url: process.env.NEXT_PUBLIC_JUDGE0_API_URL,
            submissionCount: submissions.length,
            language: language,
            languageId: languageId
        });

        // Submit to Judge0 API
        const judge0Response = await fetch(`${process.env.NEXT_PUBLIC_JUDGE0_API_URL}?base64_encoded=false&wait=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.JUDGE0_API_KEY && {
                    'X-RapidAPI-Key': process.env.JUDGE0_API_KEY
                })
            },
            body: JSON.stringify({ submissions })
        });

        if (!judge0Response.ok) {
            console.error('Judge0 API error:', judge0Response.status, judge0Response.statusText);
            return NextResponse.json(
                { error: 'Code execution service unavailable' },
                { status: 503 }
            );
        }

        const judge0Results = await judge0Response.json();
        console.log('Judge0 response:', judge0Results);

        // Process results
        const testCaseResults = judge0Results.map((result: any, index: number) => ({
            test_case_id: problem.test_cases[index].id,
            status: result.status?.description || 'Unknown',
            runtime: result.time ? Math.round(parseFloat(result.time) * 1000) : null, // Convert to ms
            memory: result.memory || null,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            compile_output: result.compile_output || '',
            is_hidden: problem.test_cases[index].is_hidden,
            passed: result.status?.id === 3 && result.stdout?.trim() === problem.test_cases[index].expected_output.trim()
        }));

        // Determine overall status
        const hasCompileError = testCaseResults.some(r => r.compile_output);
        const hasRuntimeError = testCaseResults.some(r => r.stderr);
        const allPassed = testCaseResults.every(r => r.passed);
        const hasTimeLimit = testCaseResults.some(r => r.status === 'Time Limit Exceeded');
        const hasMemoryLimit = testCaseResults.some(r => r.status === 'Memory Limit Exceeded');

        let overallStatus: string;
        if (hasCompileError) {
            overallStatus = 'Compilation Error';
        } else if (hasRuntimeError) {
            overallStatus = 'Runtime Error';
        } else if (hasTimeLimit) {
            overallStatus = 'Time Limit Exceeded';
        } else if (hasMemoryLimit) {
            overallStatus = 'Memory Limit Exceeded';
        } else if (allPassed) {
            overallStatus = 'Accepted';
        } else {
            overallStatus = 'Wrong Answer';
        }

        // Calculate average runtime and memory
        const validResults = testCaseResults.filter(r => r.runtime !== null && r.memory !== null);
        const avgRuntime = validResults.length > 0 
            ? Math.round(validResults.reduce((sum, r) => sum + (r.runtime || 0), 0) / validResults.length)
            : null;
        const avgMemory = validResults.length > 0
            ? Math.round(validResults.reduce((sum, r) => sum + (r.memory || 0), 0) / validResults.length)
            : null;

        // Save submission to database
        const { data: submission, error: submissionError } = await supabase
            .from('submissions')
            .insert({
                user_id: user.id,
                problem_id: problem_id,
                code,
                language,
                status: overallStatus,
                runtime: avgRuntime,
                memory: avgMemory,
                test_case_results: testCaseResults,
                compile_output: testCaseResults.find(r => r.compile_output)?.compile_output || null,
                error_message: testCaseResults.find(r => r.stderr)?.stderr || null
            })
            .select()
            .single();

        if (submissionError) {
            console.error('Error saving submission:', submissionError);
        }

        // Update user problem status and XP if accepted
        if (overallStatus === 'Accepted') {
            await updateUserProblemStatus(user.id, problem_id, problem.marks);
        } else {
            // Update attempt count
            await updateAttemptCount(user.id, problem_id);
        }

        // Return results (hide hidden test case details)
        const publicResults = testCaseResults.map(result => ({
            ...result,
            stdout: result.is_hidden ? '[Hidden]' : result.stdout,
            expected_output: result.is_hidden ? '[Hidden]' : problem.test_cases.find((tc: any) => tc.id === result.test_case_id)?.expected_output
        }));

        return NextResponse.json({
            success: true,
            submission_id: submission?.id,
            status: overallStatus,
            runtime: avgRuntime,
            memory: avgMemory,
            test_case_results: publicResults,
            passed_count: testCaseResults.filter(r => r.passed).length,
            total_count: testCaseResults.length,
            compile_output: testCaseResults.find(r => r.compile_output)?.compile_output || null
        });

    } catch (error) {
        console.error('Error in code submission:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function updateUserProblemStatus(userId: string, problemId: string, marks: number) {
    try {
        // Check current status
        const { data: currentStatus } = await supabase
            .from('user_problem_status')
            .select('*')
            .eq('user_id', userId)
            .eq('problem_id', problemId)
            .single();

        let xpToAward = marks;
        
        if (currentStatus) {
            // User has attempted this problem before
            if (currentStatus.status === 'solved') {
                // Already solved, no XP change
                xpToAward = 0;
            } else if (currentStatus.status === 'viewed_solution') {
                // Viewed solution before, award half XP
                xpToAward = Math.floor(marks / 2);
            }

            // Update existing status
            await supabase
                .from('user_problem_status')
                .update({
                    status: 'solved',
                    solved_at: new Date().toISOString(),
                    xp_earned: currentStatus.xp_earned + xpToAward,
                    attempts_count: currentStatus.attempts_count + 1
                })
                .eq('user_id', userId)
                .eq('problem_id', problemId);
        } else {
            // First time solving
            await supabase
                .from('user_problem_status')
                .insert({
                    user_id: userId,
                    problem_id: problemId,
                    status: 'solved',
                    solved_at: new Date().toISOString(),
                    xp_earned: xpToAward,
                    attempts_count: 1
                });
        }

        // Award XP to user
        if (xpToAward > 0) {
            await supabase.rpc('award_xp', {
                user_id_param: userId,
                xp_amount: xpToAward
            });
        }

    } catch (error) {
        console.error('Error updating user problem status:', error);
    }
}

async function updateAttemptCount(userId: string, problemId: string) {
    try {
        const { data: currentStatus } = await supabase
            .from('user_problem_status')
            .select('*')
            .eq('user_id', userId)
            .eq('problem_id', problemId)
            .single();

        if (currentStatus) {
            await supabase
                .from('user_problem_status')
                .update({
                    status: currentStatus.status === 'unattempted' ? 'attempted' : currentStatus.status,
                    last_attempted_at: new Date().toISOString(),
                    attempts_count: currentStatus.attempts_count + 1
                })
                .eq('user_id', userId)
                .eq('problem_id', problemId);
        } else {
            await supabase
                .from('user_problem_status')
                .insert({
                    user_id: userId,
                    problem_id: problemId,
                    status: 'attempted',
                    last_attempted_at: new Date().toISOString(),
                    attempts_count: 1,
                    xp_earned: 0
                });
        }
    } catch (error) {
        console.error('Error updating attempt count:', error);
    }
}