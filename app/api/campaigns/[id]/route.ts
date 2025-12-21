import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

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
