import { NextRequest, NextResponse } from 'next/server';
import { checkSubdomainAvailability, validateSubdomain } from '@/lib/cloudflare';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subdomain = searchParams.get('subdomain');

        if (!subdomain) {
            return NextResponse.json(
                { error: 'Subdomain parameter is required' },
                { status: 400 }
            );
        }

        // Validate subdomain format
        const validation = validateSubdomain(subdomain);
        if (!validation.valid) {
            return NextResponse.json({
                available: false,
                domains: {},
                error: validation.error
            });
        }

        // Check availability across all domains
        const availability = await checkSubdomainAvailability(subdomain);

        return NextResponse.json(availability);

    } catch (error: any) {
        console.error('Error checking subdomain availability:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
