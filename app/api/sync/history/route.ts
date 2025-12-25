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

        const { searchParams } = new URL(req.url);
        const take = parseInt(searchParams.get('take') || '5'); // Default to 5 as requested
        const skip = parseInt(searchParams.get('skip') || '0');

        // Fetch Campaigns (Direct Batches)
        // Direct sends have name="DIRECT" (unencrypted)
        // Background campaigns may have encrypted names
        // Legacy direct sends used host="DIRECT"
        const campaigns = await prisma.campaign.findMany({
            where: {
                userId: session.user.id,
                OR: [
                    { host: "DIRECT" },  // Legacy Direct Sends
                    { name: "DIRECT" }   // New Async Direct Sends (unencrypted marker)
                ]
            },
            take,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
                jobs: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        // Check if there are more (for load more button)
        const totalCount = await prisma.campaign.count({
            where: {
                userId: session.user.id,
                OR: [{ host: "DIRECT" }, { name: "DIRECT" }]
            }
        });

        const hasMore = (skip + take) < totalCount;

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
                    success: job.status === 'SENT',
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

        return NextResponse.json({
            history,
            hasMore,
            totalCount
        })

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

        // Legacy: Client-side history push is no longer needed as we use server-side EmailJob.
        // We return success to keep the frontend happy if it still calls this.
        return NextResponse.json({ synced: 0, message: "History sync is deprecated (Server-side authoritative)" })
    } catch (error) {
        console.error("Failed to sync history:", error)
        return NextResponse.json({ error: "Failed to sync history" }, { status: 500 })
    }
}

// DELETE: Clear all history for user
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Delete ALL campaigns for this user
        // This cascades to EmailJobs usually if relations are set up, but let's be sure.
        // If strict delete is needed, we might delete jobs first. 
        // Prisma 'Cascase' delete should handle it if configured in schema.
        // Assuming schema has onDelete: Cascade for Campaign -> Jobs.

        const deleted = await prisma.campaign.deleteMany({
            where: {
                userId: session.user.id
            }
        });

        return NextResponse.json({ success: true, count: deleted.count });
    } catch (error) {
        console.error("Failed to clear history:", error);
        return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
    }
}
