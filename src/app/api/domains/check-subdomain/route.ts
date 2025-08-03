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
        const { domain_id, subdomain } = body;

        if (!domain_id || !subdomain) {
            return NextResponse.json(
                { error: 'Missing required fields: domain_id, subdomain' },
                { status: 400 }
            );
        }

        // Validate subdomain format
        const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]*$/;
        if (!subdomainRegex.test(subdomain)) {
            return NextResponse.json(
                { error: 'Invalid subdomain format. Use only letters, numbers, and hyphens.' },
                { status: 400 }
            );
        }

        const isAvailable = await donatedDomainManager.checkSubdomainAvailability(domain_id, subdomain);

        return NextResponse.json({
            success: true,
            available: isAvailable,
            message: isAvailable ? 'Subdomain is available' : 'Subdomain is already taken'
        });

    } catch (error) {
        console.error('Error checking subdomain availability:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
