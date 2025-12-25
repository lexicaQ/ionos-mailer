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

        // Get all campaigns with their jobs and tracking info
        const campaigns = await prisma.campaign.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5, // Reduced to 5 to significantly lower Compute Unit usage (User request)
            // include: { jobs: ... } REMOVED for optimization. We fetch stats via groupBy instead.
        });

        const secretKey = process.env.ENCRYPTION_KEY!;

        // Efficiently fetch only metadata + stats (No heavy jobs array)
        const result = await Promise.all(campaigns.map(async (campaign: any) => {
            // Decrypt campaign name
            let decryptedName = campaign.name;
            if (campaign.name) {
                try {
                    decryptedName = decrypt(campaign.name, secretKey);
                } catch (e) {
                    decryptedName = campaign.name;
                }
            }

            // 1. Get Status Counts via GroupBy (Very fast)
            const statusCounts = await prisma.emailJob.groupBy({
                by: ['status'],
                where: { campaignId: campaign.id },
                _count: true
            });

            // 2. Get Open Count via count (fast index scan)
            const openedCount = await prisma.emailJob.count({
                where: {
                    campaignId: campaign.id,
                    openedAt: { not: null }
                }
            });

            const statsMap = statusCounts.reduce((acc, curr) => {
                acc[curr.status] = curr._count;
                return acc;
            }, {} as Record<string, number>);

            return {
                id: campaign.id,
                name: decryptedName,
                isDirect: campaign.host === 'DIRECT' || campaign.name === 'DIRECT',
                createdAt: campaign.createdAt.toISOString(),
                jobs: [], // EMPTY by default to save bandwidth/DB
                stats: {
                    total: Object.values(statsMap).reduce((a, b) => a + b, 0),
                    sent: statsMap['SENT'] || 0,
                    pending: statsMap['PENDING'] || 0,
                    failed: statsMap['FAILED'] || 0,
                    opened: openedCount
                }
            };
        }));

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Status fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
