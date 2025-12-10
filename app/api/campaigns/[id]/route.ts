import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        // 1. Delete associated clicks
        // First find all jobs
        const jobs = await prisma.emailJob.findMany({
            where: { campaignId: id },
            select: { id: true }
        });
        const jobIds = jobs.map(j => j.id);

        await prisma.click.deleteMany({
            where: { emailJobId: { in: jobIds } }
        });

        // 2. Delete jobs
        await prisma.emailJob.deleteMany({
            where: { campaignId: id }
        });

        // 3. Delete campaign
        await prisma.campaign.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
