import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: campaignId } = await params;

        // Verify ownership before deletion
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { userId: true }
        });

        if (!campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        if (campaign.userId !== session.user.id) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Delete campaign (cascade will delete jobs and attachments)
        await prisma.campaign.delete({
            where: { id: campaignId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete campaign error:", error);
        return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
    }
}
