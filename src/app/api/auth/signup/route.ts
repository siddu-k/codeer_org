import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { email, password, displayName } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters long' },
                { status: 400 }
            );
        }

        // Sign up user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName || email.split('@')[0]
                }
            }
        });

        if (error) {
            console.error('Supabase signup error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        // Create user profile in our users table
        if (data.user) {
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: data.user.id,
                    email: data.user.email,
                    display_name: displayName || email.split('@')[0],
                    total_xp: 0,
                    problems_solved: 0,
                    current_streak: 0,
                    max_streak: 0
                });

            if (profileError) {
                console.error('Error creating user profile:', profileError);
                // Don't fail the signup if profile creation fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Account created successfully! Please check your email to verify your account.',
            user: {
                id: data.user?.id,
                email: data.user?.email
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}