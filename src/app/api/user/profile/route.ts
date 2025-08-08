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

        // Get user profile
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();

        if (error || !user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                github_username: user.github_username,
                total_xp: user.total_xp,
                problems_solved: user.problems_solved,
                current_streak: user.current_streak,
                max_streak: user.max_streak,
                last_solved_at: user.last_solved_at,
                preferred_language: user.preferred_language,
                bio: user.bio,
                location: user.location,
                website_url: user.website_url,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
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
            display_name,
            bio,
            location,
            website_url,
            preferred_language
        } = body;

        // Update user profile
        const { data: user, error } = await supabase
            .from('users')
            .update({
                display_name,
                bio,
                location,
                website_url,
                preferred_language,
                updated_at: new Date().toISOString()
            })
            .eq('email', session.user.email)
            .select()
            .single();

        if (error) {
            console.error('Error updating user profile:', error);
            return NextResponse.json(
                { error: 'Failed to update profile' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}