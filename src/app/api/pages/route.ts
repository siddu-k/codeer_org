import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { pageManager } from '@/lib/pageManager';
import { getUserByEmail } from '@/lib/userSync';

export async function GET(request: NextRequest) {
    try {
        console.log('=== Pages API Called ===');
        const session = await getServerSession(authOptions);
        console.log('Session:', session?.user?.email);

        if (!session?.user?.email) {
            console.log('No session or email found');
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Get user info
        console.log('Looking up user by email:', session.user.email);
        const user = await getUserByEmail(session.user.email);
        console.log('User found:', user?.id);

        if (!user) {
            console.log('User not found in database');
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get user's pages
        console.log('Fetching pages for user ID:', user.id);
        const pages = await pageManager.getUserPages(user.id);
        console.log('Pages found:', pages.length);
        console.log('Raw pages data:', JSON.stringify(pages, null, 2));

        const formattedPages = pages.map(page => ({
            id: page.id,
            title: page.title,
            domain: page.full_domain,
            status: page.status,
            deployment_status: page.deployment_status,
            github_repo: page.github_repo,
            custom_url: page.custom_domain_url,
            created_at: page.created_at,
            last_updated: page.last_updated,
            file_count: page.file_count,
            page_views: page.page_views || 0
        }));

        console.log('Formatted pages:', JSON.stringify(formattedPages, null, 2));

        return NextResponse.json({
            pages: formattedPages
        });

    } catch (error: any) {
        console.error('Error fetching user pages:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
