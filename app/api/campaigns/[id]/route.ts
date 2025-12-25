import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { decrypt } from '@/lib/encryption';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Fetch single campaign with ALL jobs
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                jobs: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!campaign || campaign.userId !== session.user.id) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        const secretKey = process.env.ENCRYPTION_KEY!;

        let decryptedName = campaign.name;
        if (campaign.name) {
            try {
                decryptedName = decrypt(campaign.name, secretKey);
            } catch (e) {
                decryptedName = campaign.name;
            }
        }

        // Transform response to match the "status" endpoint format
        const result = {
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

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Fetch campaign error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // CRITICAL: Verify ownership before deletion
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify the campaign belongs to this user
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!campaign || campaign.userId !== session.user.id) {
            return NextResponse.json({ error: "Campaign not found or access denied" }, { status: 403 });
        }

        // TRANSACTIONAL DELETE: Atomic deletion prevents partial state and false errors
        await prisma.$transaction([
            prisma.campaignAttachment.deleteMany({ where: { campaignId: id } }),
            prisma.emailJob.deleteMany({ where: { campaignId: id } }),
            prisma.campaign.delete({ where: { id } })
        ]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
