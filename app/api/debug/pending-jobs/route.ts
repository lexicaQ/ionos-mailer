import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const pendingJobs = await prisma.emailJob.findMany({
            where: {
                status: 'PENDING'
            },
            include: {
                campaign: {
                    select: {
                        user: true,
                        host: true
                    }
                }
            },
            take: 20
        });

        const jobsWithLocalTime = pendingJobs.map(j => ({
            id: j.id,
            recipient: j.recipient,
            scheduledFor: j.scheduledFor,
            scheduledForLocal: new Date(j.scheduledFor).toLocaleString('de-DE'),
            nowLocal: new Date().toLocaleString('de-DE'),
            isDue: new Date(j.scheduledFor) <= new Date(),
            user: j.campaign.user
        }));

        return NextResponse.json({
            status: "ok",
            env: {
                hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
                hasDbUrl: !!process.env.POSTGRES_PRISMA_DATABASE_URL,
                baseUrl: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL || 'localhost'
            },
            count: pendingJobs.length,
            serverTime: new Date().toISOString(),
            jobs: jobsWithLocalTime
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
