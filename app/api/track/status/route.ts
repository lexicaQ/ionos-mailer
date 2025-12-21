import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to check tracking status for multiple tracking IDs
 * Used by the history modal to show open status for immediate sends
 * 
 * GET /api/track/status?ids=id1,id2,id3
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const idsParam = url.searchParams.get('ids');

        if (!idsParam) {
            return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
        }

        const trackingIds = idsParam.split(',').filter(id => id.trim().length > 0);

        if (trackingIds.length === 0) {
            return NextResponse.json({});
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
            statusMap[job.trackingId] = {
                opened: !!job.openedAt,
                openedAt: job.openedAt?.toISOString() || null,
                openCount: job.openCount,
            };
        }

        // For tracking IDs not in DB (immediate sends), check if they've been opened
        // by looking at the tracking API's in-memory or checking cookies/logs
        // For now, we return "unknown" for these
        for (const id of trackingIds) {
            if (!statusMap[id]) {
                statusMap[id] = {
                    opened: false,
                    openedAt: null,
                    openCount: 0,
                };
            }
        }

        return NextResponse.json(statusMap);

    } catch (error: any) {
        console.error('Track status API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
