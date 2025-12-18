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
        const jobs = await prisma.emailJob.findMany({
            where: {
                campaign: { userId: session.user.id },
                status: { in: ['SENT', 'FAILED'] }
            },
            take: 1000,
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
                userId: session.user.id,
                subject: subject,
                recipients: JSON.stringify([email]), // Front-end expects JSON array string for recipients? Or just plain string? 
                // Looking at SentEmail model: recipients String @db.Text // JSON array
                // But the History List UI expects { email, success, error, batchTime ... }
                // Wait, components/history-modal.tsx iterates `allResults` which has { email, success, batchTime ... }
                // But `sync/history` returned `SentEmail` objects previously.
                // Let's look at what `components/history-modal.tsx` expects.
                // It calls `/api/sync/history`.
                // It sets `setBatches`.
                // Then `allResults` is calculated from `batches`.
                // Previously `SentEmail` had `recipients` as a JSON array string.
                // Here we return individual jobs.
                // This means the FRONTEND expects `SentEmail` objects (Groups).
                // Returning individual jobs as if they were batches of 1 is a valid strategy to avoid complex grouping logic.

                recipient: email, // If UI supports single recipient field?
                // To keep it compatible with existing UI processing which likely parses `recipients` JSON:
                body: "Check details",
                createdAt: job.createdAt,
                sentAt: job.sentAt || job.createdAt,
                status: job.status,
                error: job.error,
                openedCount: job.openCount,
                clickedCount: 0 // Fetch clicks if needed
            }
        });

        // ADAPTER: The UI likely parses `recipients` from JSON.
        // Let's make sure we return objects that match what `SentEmail` produced.
        // `SentEmail` had: id, userId, subject, body, recipients (JSON), sentAt, ...

        return NextResponse.json(history.map(h => ({
            ...h,
            recipients: JSON.stringify([h.recipient]) // Wrap single recipient in array
        })))

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

            // Strategy: Client sends a list. We upsert each.
            const record = await prisma.sentEmail.upsert({
                where: { id: batch.id || "new" },
                create: {
                    userId: session.user.id,
                    subject: batch.subject,
                    body: batch.body,
                    recipients: JSON.stringify(batch.recipients),
                    attachments: undefined, // Attachments might be too heavy?
                    sentAt: new Date(batch.sentAt),
                    // If batch has an ID, use it? Prisma relies on CUID usually.
                    // If we force an ID, it must be unique.
                    // If batch.id is a local ID (e.g. valid CUID or similar), use it.
                    // If it's a simple number/string, might fail.
                    // Let's omit ID to let Prisma gen one, OR trust client ID if it looks like CUID.
                },
                update: {
                    // Generally history doesn't change, but maybe status opens/clicks?
                    clickedCount: batch.clickedCount,
                    openedCount: batch.openedCount
                }
            })
            synced.push(record)
        }

        return NextResponse.json({ success: true, synced })
    } catch (error) {
        console.error("Failed to sync history:", error)
        return NextResponse.json({ error: "Failed to sync history" }, { status: 500 })
    }
}
