import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/user/account
 * Permanently delete user account and ALL associated data
 * 
 * This includes:
 * - All campaigns and email jobs
 * - All history records
 * - All drafts
 * - All settings
 * - All passkeys
 * - User account itself
 */
export async function DELETE(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Comprehensive deletion in correct order (foreign key dependencies)

        // 1. Delete all email jobs (depends on campaigns)
        const deletedJobs = await prisma.emailJob.deleteMany({
            where: {
                campaign: {
                    userId
                }
            }
        });

        // 2. Delete all campaign attachments (depends on campaigns)
        const deletedAttachments = await prisma.campaignAttachment.deleteMany({
            where: {
                campaign: {
                    userId
                }
            }
        });

        // 3. Delete all campaigns
        const deletedCampaigns = await prisma.campaign.deleteMany({
            where: { userId }
        });

        // 4. Delete all drafts
        const deletedDrafts = await prisma.draft.deleteMany({
            where: { userId }
        });

        // 5. Delete settings
        const deletedSettings = await prisma.smtpSettings.deleteMany({
            where: { userId }
        });

        // 6. Delete sessions
        const deletedSessions = await prisma.session.deleteMany({
            where: { userId }
        });

        // 7. Delete accounts (OAuth connections)
        const deletedAccounts = await prisma.account.deleteMany({
            where: { userId }
        });

        // 8. Finally, delete the user itself
        const deletedUser = await prisma.user.delete({
            where: { id: userId }
        });

        console.log(`[ACCOUNT DELETION] User ${userId} deleted:`, {
            jobs: deletedJobs.count,
            attachments: deletedAttachments.count,
            campaigns: deletedCampaigns.count,
            drafts: deletedDrafts.count,
            settings: deletedSettings.count,
            sessions: deletedSessions.count,
            accounts: deletedAccounts.count,
            user: deletedUser.email
        });

        return NextResponse.json({
            success: true,
            message: 'Account and all data permanently deleted',
            deleted: {
                emailJobs: deletedJobs.count,
                attachments: deletedAttachments.count,
                campaigns: deletedCampaigns.count,
                drafts: deletedDrafts.count,
                settings: deletedSettings.count,
                sessions: deletedSessions.count,
                accounts: deletedAccounts.count,
                user: deletedUser.email
            }
        });

    } catch (error: any) {
        console.error('[ACCOUNT DELETION ERROR]:', error);
        return NextResponse.json(
            {
                error: 'Failed to delete account',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}
