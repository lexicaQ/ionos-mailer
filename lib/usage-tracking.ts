import { prisma } from '@/lib/prisma';

/**
 * Updates the monthly usage counter for a user
 * This is called after successfully creating a campaign
 */
export async function incrementMonthlyUsage(userId: string, emailCount: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    try {
        // Use upsert to either create or update the record
        await prisma.userMonthlyUsage.upsert({
            where: {
                userId_year_month: {
                    userId,
                    year,
                    month
                }
            },
            create: {
                userId,
                year,
                month,
                emailsSent: emailCount
            },
            update: {
                emailsSent: {
                    increment: emailCount
                }
            }
        });
    } catch (error) {
        console.error('Failed to update monthly usage:', error);
        // Don't throw - this is analytics, shouldn't block email sending
    }
}

/**
 * Gets current monthly usage for a user (reads from DB)
 */
export async function getMonthlyUsage(userId: string): Promise<number> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const record = await prisma.userMonthlyUsage.findUnique({
        where: {
            userId_year_month: {
                userId,
                year,
                month
            }
        }
    });

    return record?.emailsSent ?? 0;
}

/**
 * Gets user plan from database
 */
export async function getUserPlan(userId: string): Promise<'FREE' | 'UNLIMITED'> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true }
    });

    return (user?.plan as 'FREE' | 'UNLIMITED') ?? 'FREE';
}
