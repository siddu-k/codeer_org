import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { donatedDomainManager } from '@/lib/donatedDomains';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const domainId = params.id;

        if (!domainId) {
            return NextResponse.json(
                { error: 'Domain ID required' },
                { status: 400 }
            );
        }

        const usage = await donatedDomainManager.getDomainUsageStats(domainId);

        return NextResponse.json({
            success: true,
            usage
        });

    } catch (error) {
        console.error('Error fetching domain usage:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const domainId = params.id;
        const body = await req.json();

        if (!domainId) {
            return NextResponse.json(
                { error: 'Domain ID required' },
                { status: 400 }
            );
        }

        const { action, ...updates } = body;

        let result = false;

        if (action === 'toggle-status') {
            result = await donatedDomainManager.toggleDomainStatus(domainId, updates.is_active);
        } else if (action === 'update-settings') {
            result = await donatedDomainManager.updateDomainSettings(domainId, updates);
        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use "toggle-status" or "update-settings"' },
                { status: 400 }
            );
        }

        if (!result) {
            return NextResponse.json(
                { error: 'Failed to update domain' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Domain updated successfully'
        });

    } catch (error) {
        console.error('Error updating domain:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
