import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // CRITICAL: Use authenticated session instead of spoofable header
        const session = await auth();

        if (!session?.user?.id) {
            // Return empty array for unauthenticated requests (no data leak)
            return NextResponse.json([]);
        }

        const userId = session.user.id;

        // Check for lazy loading mode
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'full'; // 'overview' or 'full'

        // Get all campaigns with their jobs and tracking info
        const campaigns = await prisma.campaign.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 15, // Reduced from 50 for faster sync logic
            include: mode === 'full' ? {
                jobs: {
                    orderBy: { createdAt: 'desc' }
                }
            } : undefined
        });

        const secretKey = process.env.ENCRYPTION_KEY!;

        // Transform data for frontend with decryption
        const result = campaigns.map((campaign: any) => {
            // Decrypt campaign name (may be null or legacy unencrypted)
            let decryptedName = campaign.name;
            if (campaign.name) {
                try {
                    decryptedName = decrypt(campaign.name, secretKey);
                } catch (e) {
                    // Legacy unencrypted name, keep as-is
                    decryptedName = campaign.name;
                }
            }

            // In overview mode, don't include jobs to reduce response size
            if (mode === 'overview') {
                return {
                    id: campaign.id,
                    name: decryptedName,
                    isDirect: campaign.host === 'DIRECT' || campaign.name === 'DIRECT',
                    createdAt: campaign.createdAt.toISOString(),
                    jobs: [], // Empty array for lazy loading
                    stats: {
                        total: campaign._count?.jobs || 0,
                        sent: 0, // Will be calculated when jobs load
                        pending: 0,
                        failed: 0,
                        opened: 0
                    }
                };
            }

            // Full mode - include all jobs
            return {
                id: campaign.id,
                name: decryptedName,
                isDirect: campaign.host === 'DIRECT' || campaign.name === 'DIRECT',
                createdAt: campaign.createdAt.toISOString(),
                jobs: campaign.jobs.map((job: any) => ({
                    id: job.id,
                    trackingId: job.trackingId,
                    recipient: decrypt(job.recipient, process.env.ENCRYPTION_KEY!),
                    subject: decrypt(job.subject, process.env.ENCRYPTION_KEY!),
                    status: job.status,
                    scheduledFor: job.scheduledFor.toISOString(),
                    originalScheduledFor: job.originalScheduledFor?.toISOString() || null,
                    sentAt: job.sentAt?.toISOString() || null,
                    error: job.error,
                    // Retry tracking
                    retryCount: job.retryCount || 0,
                    maxRetries: job.maxRetries || 3,
                    nextRetryAt: job.nextRetryAt?.toISOString() || null,
                    // Cron tracking
                    sentViaCron: job.sentViaCron || false,
                    // Tracking data
                    openedAt: job.openedAt?.toISOString() || null,
                    openCount: job.openCount,
                    // Bounce tracking
                    isBounce: job.isBounce || false,
                    bounceCode: job.bounceCode || null,
                    bounceReason: job.bounceReason || null,
                    bouncedAt: job.bouncedAt?.toISOString() || null,
                })),
                stats: {
                    total: campaign.jobs.length,
                    sent: campaign.jobs.filter((j: any) => j.status === 'SENT').length,
                    pending: campaign.jobs.filter((j: any) => j.status === 'PENDING').length,
                    failed: campaign.jobs.filter((j: any) => j.status === 'FAILED').length,
                    bounced: campaign.jobs.filter((j: any) => j.status === 'BOUNCED' || j.isBounce).length,
                    opened: campaign.jobs.filter((j: any) => j.openedAt).length
                }
            };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Status fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
