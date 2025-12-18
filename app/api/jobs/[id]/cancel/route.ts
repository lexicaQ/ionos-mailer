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
        // Find job and verify ownership via Campaign
        const job = await prisma.emailJob.findUnique({
            where: { id },
            include: { campaign: true }
        });

        if (!job || job.campaign.userId !== session.user.id) {
            return NextResponse.json({ error: "Job not found or access denied" }, { status: 404 });
        }

        if (job.status !== "PENDING" && job.status !== "WAITING") {
            // "WAITING" is not a DB status, usually "PENDING"
            // But let's just check for non-final
            if (job.status === "SENT" || job.status === "CANCELLED" || job.status === "FAILED") {
                return NextResponse.json({ error: "Job already finished" }, { status: 400 });
            }
        }

        // Cancel it
        const result = await prisma.emailJob.update({
            where: { id },
            data: { status: "CANCELLED" }
        });

        return NextResponse.json({ success: true, job: result });
    } catch (error) {
        console.error("Failed to cancel job:", error);
        return NextResponse.json({ error: "Failed to cancel job" }, { status: 500 });
    }
}
