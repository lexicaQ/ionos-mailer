import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { checkUsageStatus } from '@/lib/usage-limit';

export async function GET() {
    try {
        // Require authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate usage stats for each user
        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const stats = await checkUsageStatus(user.id);

                return {
                    id: user.id,
                    email: user.email,
                    createdAt: user.createdAt,
                    plan: stats.plan,
                    usage: stats.usage,
                    limit: stats.limit,
                    remaining: stats.remaining,
                    isLegacyUser: stats.plan === "UNLIMITED"
                };
            })
        );

        // Calculate summary stats
        const summary = {
            totalUsers: users.length,
            freeUsers: usersWithStats.filter(u => u.plan === "FREE").length,
            unlimitedUsers: usersWithStats.filter(u => u.plan === "UNLIMITED").length,
            totalEmailsSent: usersWithStats.reduce((sum, u) => sum + u.usage, 0),
        };

        return NextResponse.json({
            summary,
            users: usersWithStats
        });

    } catch (error: any) {
        console.error("Admin users fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
