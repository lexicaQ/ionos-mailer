import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"
import { NextResponse } from "next/server"

// GET: List all history (Fetch from EmailJob)
export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) throw new Error("Encryption key missing");

        // Fetch jobs via campaigns owned by user
        // We strict filter for campaigns created by the 'Direct Send' flow
        const jobs = await prisma.emailJob.findMany({
            where: {
                campaign: {
                    userId: session.user.id,
                    host: "DIRECT" // Only show "Direct Send" emails in the history popup
                },
                status: { in: ['SENT', 'FAILED', 'PENDING', 'SENDING'] } // Include Waiting/Sending
            },
            take: 50, // Limit to 50 for performance (Lazy Load)
            orderBy: { createdAt: 'desc' },
            include: { campaign: true } // Need campaign to verify ownership context if needed
        })

        // Map to expected history format (SentEmail-like structure)
        const history = jobs.map(job => {
            let email = "Encrypted";
            let subject = "Encrypted";
            try {
                email = decrypt(job.recipient, secretKey);
                // Try decrypt subject (it might be plain text in old legacy data, but assume encrypted for new)
                // Actually subject IS encrypted in creation logic.
                subject = decrypt(job.subject, secretKey);
            } catch (e) {
                // Determine if it was legacy plain text?
                // For now, if decrypt fails, return raw or error. 
                // Since this is a hard cutover, legacy data might break. 
                // We'll return raw if decrypt fails, assuming legacy plain text.
                email = job.recipient;
                subject = job.subject;
            }

            return {
                id: job.id,
                sentAt: (job.sentAt || job.createdAt).toISOString(),
                total: 1,
                success: job.status === 'SENT' ? 1 : 0,
                failed: job.status === 'FAILED' ? 1 : 0,
                subject: subject,
                body: "Check details", // Placeholder
                results: [{
                    email: email,
                    status: (job.status === 'PENDING' || job.status === 'SENDING') ? 'waiting' : (job.status === 'SENT' ? 'success' : 'error'),
                    error: job.error,
                    trackingId: job.trackingId,
                    messageId: undefined, // Not stored in EmailJob currently
                    batchTime: (job.sentAt || job.createdAt).toISOString()
                }]
            }
        });

        // Return the batch list directly (it is already an array of HistoryBatch-like objects)
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
