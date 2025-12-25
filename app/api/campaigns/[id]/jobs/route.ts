import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: campaignId } = await params;

        // Fetch campaign with jobs
        const campaign = await prisma.campaign.findUnique({
            where: {
                id: campaignId,
                userId: session.user.id // Security: Only allow access to own campaigns
            },
            include: {
                jobs: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const secretKey = process.env.ENCRYPTION_KEY!;

        // Transform jobs
        const jobs = campaign.jobs.map((job: any) => ({
            id: job.id,
            trackingId: job.trackingId,
            recipient: decrypt(job.recipient, secretKey),
            subject: decrypt(job.subject, secretKey),
            status: job.status,
            scheduledFor: job.scheduledFor.toISOString(),
            originalScheduledFor: job.originalScheduledFor?.toISOString() || null,
            sentAt: job.sentAt?.toISOString() || null,
            error: job.error,
            retryCount: job.retryCount || 0,
            maxRetries: job.maxRetries || 3,
            nextRetryAt: job.nextRetryAt?.toISOString() || null,
            sentViaCron: job.sentViaCron || false,
            openedAt: job.openedAt?.toISOString() || null,
            openCount: job.openCount
        }));

        // Calculate stats
        const stats = {
            total: campaign.jobs.length,
            sent: campaign.jobs.filter((j: any) => j.status === 'SENT').length,
            pending: campaign.jobs.filter((j: any) => j.status === 'PENDING').length,
            failed: campaign.jobs.filter((j: any) => j.status === 'FAILED').length,
            opened: campaign.jobs.filter((j: any) => j.openedAt).length
        };

        return NextResponse.json({ jobs, stats });
    } catch (error: any) {
        console.error('Job fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
