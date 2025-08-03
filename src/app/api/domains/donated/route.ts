import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { donatedDomainManager } from '@/lib/donatedDomains';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const {
            domain_name,
            cloudflare_zone_id,
            cloudflare_api_token,
            max_subdomains,
            donation_message,
            contact_email,
            terms_of_use
        } = body;

        // Validate required fields
        if (!domain_name || !cloudflare_zone_id || !cloudflare_api_token) {
            return NextResponse.json(
                { error: 'Missing required fields: domain_name, cloudflare_zone_id, cloudflare_api_token' },
                { status: 400 }
            );
        }

        // Extract user ID from session
        const userId = session.user.email; // You might need to adjust this based on your auth setup

        const result = await donatedDomainManager.submitDomain(userId, {
            domain_name,
            cloudflare_zone_id,
            cloudflare_api_token,
            max_subdomains: max_subdomains || 100,
            donation_message,
            contact_email: contact_email || session.user.email,
            terms_of_use
        });

        if (!result) {
            return NextResponse.json(
                { error: 'Failed to submit domain. Please check your Cloudflare credentials.' },
                { status: 400 }
            );
        }

        // Don't return the API token in response for security
        const { cloudflare_api_token: _, ...safeResult } = result;

        return NextResponse.json({
            success: true,
            domain: safeResult,
            message: 'Domain submitted successfully! It will be available for users after verification.'
        });

    } catch (error: any) {
        console.error('Error in domain submission:', error);

        if (error.message.includes('Invalid domain name')) {
            return NextResponse.json(
                { error: 'Invalid domain name format' },
                { status: 400 }
            );
        }

        if (error.message.includes('Invalid Cloudflare credentials')) {
            return NextResponse.json(
                { error: 'Invalid Cloudflare credentials. Please check your API token and Zone ID.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const url = new URL(req.url);
        const type = url.searchParams.get('type') || 'available';

        let domains;

        if (type === 'available') {
            // Get all available domains for use
            domains = await donatedDomainManager.getAvailableDomains();

            // Remove sensitive information
            domains = domains.map(domain => ({
                id: domain.id,
                domain_name: domain.domain_name,
                max_subdomains: domain.max_subdomains,
                current_subdomains: domain.current_subdomains,
                donation_message: domain.donation_message,
                contact_email: domain.contact_email,
                terms_of_use: domain.terms_of_use,
                created_at: domain.created_at
            }));
        } else if (type === 'my-domains') {
            // Get domains donated by current user
            const userId = session.user.email;
            domains = await donatedDomainManager.getUserDonatedDomains(userId);

            // Remove API token from response for security
            domains = domains.map(domain => ({
                ...domain,
                cloudflare_api_token: undefined
            }));
        }

        return NextResponse.json({
            success: true,
            domains: domains || []
        });

    } catch (error) {
        console.error('Error fetching donated domains:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
