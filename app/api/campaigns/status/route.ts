import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Get all campaigns with their jobs and tracking info
        const campaigns = await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                jobs: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        clicks: true
                    }
                }
            }
        });

        // Transform data for frontend
        const result = campaigns.map(campaign => ({
            id: campaign.id,
            createdAt: campaign.createdAt.toISOString(),
            jobs: campaign.jobs.map(job => ({
                id: job.id,
                trackingId: job.trackingId,
                recipient: job.recipient,
                subject: job.subject,
                status: job.status,
                scheduledFor: job.scheduledFor.toISOString(),
                sentAt: job.sentAt?.toISOString() || null,
                error: job.error,
                // Tracking data
                openedAt: job.openedAt?.toISOString() || null,
                openCount: job.openCount,
                clickCount: job.clicks.length,
                clicks: job.clicks.map(c => ({
                    url: c.url,
                    clickedAt: c.clickedAt.toISOString()
                }))
            })),
            stats: {
                total: campaign.jobs.length,
                sent: campaign.jobs.filter(j => j.status === 'SENT').length,
                pending: campaign.jobs.filter(j => j.status === 'PENDING').length,
                failed: campaign.jobs.filter(j => j.status === 'FAILED').length,
                opened: campaign.jobs.filter(j => j.openedAt).length,
                clicked: campaign.jobs.filter(j => j.clicks.length > 0).length,
            }
        }));

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Status fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
