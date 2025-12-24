import { prisma } from '@/lib/prisma';
import { decryptMaybeLegacy } from '@/lib/encryption';

export async function getInitialCampaigns(userId: string) {
    try {
        // Get all campaigns with their jobs and tracking info
        const campaigns = await prisma.campaign.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 15,
            include: {
                jobs: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        const secretKey = process.env.ENCRYPTION_KEY!;

        // Transform data match the frontend interface
        return campaigns.map((campaign: any) => {
            let decryptedName = campaign.name;
            if (campaign.name) {
                try {
                    decryptedName = decryptMaybeLegacy(campaign.name, secretKey);
                } catch (e) {
                    decryptedName = campaign.name;
                }
            }

            return {
                id: campaign.id,
                name: decryptedName,
                isDirect: campaign.host === 'DIRECT' || campaign.name === 'DIRECT',
                createdAt: campaign.createdAt.toISOString(),
                jobs: campaign.jobs.map((job: any) => ({
                    id: job.id,
                    trackingId: job.trackingId,
                    recipient: decryptMaybeLegacy(job.recipient, process.env.ENCRYPTION_KEY!),
                    subject: decryptMaybeLegacy(job.subject, process.env.ENCRYPTION_KEY!),
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
                })),
                stats: {
                    total: campaign.jobs.length,
                    sent: campaign.jobs.filter((j: any) => j.status === 'SENT').length,
                    pending: campaign.jobs.filter((j: any) => j.status === 'PENDING').length,
                    failed: campaign.jobs.filter((j: any) => j.status === 'FAILED').length,
                    opened: campaign.jobs.filter((j: any) => j.openedAt).length
                }
            };
        });
    } catch (error) {
        console.error("Failed to fetch initial campaigns:", error);
        return [];
    }
}
