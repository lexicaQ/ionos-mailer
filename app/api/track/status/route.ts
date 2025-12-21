import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to check tracking status for multiple tracking IDs
 * Used by the history modal to show open status for immediate sends
 * 
 * GET /api/track/status?ids=id1,id2,id3
 */
const getTrackingStatus = async (trackingIds: string[]) => {
    if (trackingIds.length === 0) {
        return {};
    }

    // Query the database for tracking info
    // Check EmailJob table first (for campaign tracking)
    const jobs = await prisma.emailJob.findMany({
        where: {
            trackingId: { in: trackingIds }
        },
        select: {
            trackingId: true,
            openedAt: true,
            openCount: true,
        }
    });

    // Build response map
    const statusMap: Record<string, {
        opened: boolean;
        openedAt: string | null;
        openCount: number;
    }> = {};

    for (const job of jobs) {
        if (job.trackingId) {
            statusMap[job.trackingId] = {
                opened: !!job.openedAt,
                openedAt: job.openedAt?.toISOString() || null,
                openCount: job.openCount,
            };
        }
    }

    // Fill missing
    for (const id of trackingIds) {
        if (!statusMap[id]) {
            statusMap[id] = {
                opened: false,
                openedAt: null,
                openCount: 0,
            };
        }
    }

    return statusMap;
};

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const idsParam = url.searchParams.get('ids');

        if (!idsParam) {
            return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
        }

        const trackingIds = idsParam.split(',').filter(id => id.trim().length > 0);
        const result = await getTrackingStatus(trackingIds);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Track status API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ids } = body;

        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'ids must be an array' }, { status: 400 });
        }

        const trackingIds = ids.filter(id => typeof id === 'string' && id.trim().length > 0);
        const result = await getTrackingStatus(trackingIds);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Track status API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
