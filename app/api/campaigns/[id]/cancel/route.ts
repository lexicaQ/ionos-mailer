import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Verify ownership
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!campaign || campaign.userId !== session.user.id) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        // Cancel all PENDING/WAITING jobs for this campaign
        // Note: DB status is 'PENDING', UI might show 'WAITING'
        const result = await prisma.emailJob.updateMany({
            where: {
                campaignId: id,
                status: "PENDING"
            },
            data: {
                status: "CANCELLED"
            }
        });

        return NextResponse.json({
            success: true,
            message: `Cancelled ${result.count} pending emails`,
            count: result.count
        });
    } catch (error) {
        console.error("Failed to cancel campaign:", error);
        return NextResponse.json({ error: "Failed to cancel campaign" }, { status: 500 });
    }
}
