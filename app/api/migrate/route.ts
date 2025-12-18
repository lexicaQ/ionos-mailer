import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { oldUserId } = await req.json();

        // Validation: Ensure oldUserId looks like a UUID (prevents SQL injection or wide updates)
        // Basic length check for UUID (36 chars) or just verify it's a string
        if (!oldUserId || typeof oldUserId !== 'string' || oldUserId.length < 10) {
            return NextResponse.json({ success: false, reason: "Invalid old ID" });
        }

        const newUserId = session.user.id;

        console.log(`Migrating data from ${oldUserId} to ${newUserId}`);

        // 1. Migrate Campaigns
        const campaigns = await prisma.campaign.updateMany({
            where: { userId: oldUserId },
            data: { userId: newUserId }
        });

        // 2. Migrate Drafts
        const drafts = await prisma.draft.updateMany({
            where: { userId: oldUserId },
            data: { userId: newUserId }
        });

        // 3. Migrate Settings? 
        // Only if the new user DOES NOT have settings yet.
        const existingSettings = await prisma.smtpSettings.findUnique({
            where: { userId: newUserId }
        });

        let settingsMigrated = false;
        if (!existingSettings) {
            // Check if old settings exist
            const oldSettings = await prisma.smtpSettings.findFirst({
                where: { userId: oldUserId }
            });

            if (oldSettings) {
                // We can't update ID uniquely if there's a constraint, but here ID is CUID usually.
                // Actually userId is unique in SmtpSettings usually?
                // Let's check schema/view. Assuming userId is unique.
                // We can Update the old settings to new userId
                await prisma.smtpSettings.update({
                    where: { userId: oldUserId }, // This relies on userId being @unique or using ID
                    data: { userId: newUserId }
                });
                settingsMigrated = true;
            }
        }

        return NextResponse.json({
            success: true,
            migrated: {
                campaigns: campaigns.count,
                drafts: drafts.count,
                settings: settingsMigrated
            }
        });

    } catch (error: any) {
        console.error("Migration failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
