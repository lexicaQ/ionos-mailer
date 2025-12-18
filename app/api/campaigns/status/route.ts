import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export async function GET(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');

        // If no userId, return empty or unauthorized?
        // User said "locally stored... not visible to others"
        // Return empty if no ID provided to prevent leaking all data
        if (!userId) {
            return NextResponse.json([]);
        }

        // Get all campaigns with their jobs and tracking info
        const campaigns = await prisma.campaign.findMany({
            where: { userId },
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
        const result = campaigns.map((campaign: any) => ({
            id: campaign.id,
            createdAt: campaign.createdAt.toISOString(),
            jobs: campaign.jobs.map((job: any) => ({
                id: job.id,
                trackingId: job.trackingId,
                recipient: job.recipient,
                subject: decrypt(job.subject, process.env.ENCRYPTION_KEY!),
                status: job.status,
                scheduledFor: job.scheduledFor.toISOString(),
                sentAt: job.sentAt?.toISOString() || null,
                error: job.error,
                // Tracking data
                openedAt: job.openedAt?.toISOString() || null,
                openCount: job.openCount,
                clickCount: job.clicks.length,
                clicks: job.clicks.map((c: any) => ({
                    url: c.url,
                    clickedAt: c.clickedAt.toISOString()
                }))
            })),
            stats: {
                total: campaign.jobs.length,
                sent: campaign.jobs.filter((j: any) => j.status === 'SENT').length,
                pending: campaign.jobs.filter((j: any) => j.status === 'PENDING').length,
                failed: campaign.jobs.filter((j: any) => j.status === 'FAILED').length,
                opened: campaign.jobs.filter((j: any) => j.openedAt).length,
                clicked: campaign.jobs.filter((j: any) => j.clicks.length > 0).length,
            }
        }));

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Status fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
