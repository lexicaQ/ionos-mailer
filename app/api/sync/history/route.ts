import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"
import { NextResponse } from "next/server"

// GET: List all history (Fetch from Campaigns aka Batches)
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) throw new Error("Encryption key missing");

        // Fetch Campaigns (Direct Batches)
        // Now that we create a unique Campaign for each Direct Send batch,
        // we can fetch the campaigns and their jobs to reconstruct the history batch.
        const campaigns = await prisma.campaign.findMany({
            where: {
                userId: session.user.id,
                host: "DIRECT"
            },
            take: 20, // Limit to 20 most recent batches
            orderBy: { createdAt: 'desc' },
            include: {
                jobs: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        // Map to expected history format (HistoryBatch)
        const history = campaigns.map(campaign => {
            const results = campaign.jobs.map(job => {
                let email = "Encrypted";
                try {
                    email = decrypt(job.recipient, secretKey);
                } catch (e) {
                    email = job.recipient; // Legacy fallback
                }

                return {
                    email: email,
                    status: (job.status === 'PENDING' || job.status === 'SENDING') ? 'waiting' : (job.status === 'SENT' ? 'success' : 'error'),
                    error: job.error,
                    trackingId: job.trackingId,
                    messageId: undefined,
                    batchTime: (job.sentAt || job.createdAt).toISOString()
                };
            });

            // Decrypt campaign name (which contains Subject: ...)
            let subject = campaign.name || "Untitled";
            // Check if name starts with "Direct: " (unencrypted) or is encrypted?
            // Since we set name to `Direct: ${subject}` unencrypted in previous step, we can use it directly?
            // Actually, `fromName` was set, not `name`. 
            // Wait, Campaign model has `name` (for internal use) and `fromName` (for SMTP).
            // In api/send-emails, I set `fromName` to "Direct: ...". I did NOT set `name`.
            // So `campaign.name` might be null or "Direct Send [Month]" if legacy.
            // Let's use `fromName` or `name` or subject from first job?
            // The Subject is stored in `job.subject`. We can get it from first job.

            if (campaign.jobs.length > 0) {
                try {
                    subject = decrypt(campaign.jobs[0].subject, secretKey);
                } catch (e) {
                    subject = campaign.jobs[0].subject;
                }
            }

            return {
                id: campaign.id,
                sentAt: campaign.createdAt.toISOString(),
                total: campaign.jobs.length,
                success: campaign.jobs.filter(j => j.status === 'SENT').length,
                failed: campaign.jobs.filter(j => j.status === 'FAILED').length,
                subject: subject,
                body: "View details", // Placeholder
                results: results
            }
        });

        return NextResponse.json(history)

    } catch (error) {
        console.error("Failed to fetch history:", error)
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
    }
}

// POST: Sync history (overwrite or add)
export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { batches } = await req.json() // Expecting array of local history batches

        if (!Array.isArray(batches)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 })
        }

        const synced: any[] = []

        for (const batch of batches) {
            // Upsert based on ID if provided, or create new?
            // Local history might have IDs like "batch_..."
            // We should try to match or create.
            // Since history is immutable mostly, we can just create if not exists?
            // Or use the ID from local as unique?

            // Simple approach: Check if exists by ID, if not create.
            // But local IDs might conflict if they are just random strings.
            // Let's blindly create for now? No, duplication risk.
            // Let's assume the client sends "id" which matches DB id if verified, or local ID if not.

            // Actually, simplest is: Client pushes NEW items.
            // But syncing implies two-way.

            // Legacy: Client-side history push is no longer needed as we use server-side EmailJob.
            // We return success to keep the frontend happy if it still calls this.
            return NextResponse.json({ synced: 0, message: "History sync is deprecated (Server-side authoritative)" })

            /* 
            Legacy Logic Removed:
            const { batches } = await req.json()
            if (Array.isArray(batches)) {
                 ...
            }
            */
        }
    } catch (error) {
        console.error("Failed to sync history:", error)
        return NextResponse.json({ error: "Failed to sync history" }, { status: 500 })
    }
}
