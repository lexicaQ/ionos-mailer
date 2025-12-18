import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET: List all history
export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const history = await prisma.sentEmail.findMany({
            where: { userId: session.user.id },
            orderBy: { sentAt: 'desc' }
        })

        // Decrypt if we decide to encrypt. For now let's assume raw storage to match schema (text fields).
        // If we want encryption, we'd need to change schema to store 'encryptedData' blob like drafts?
        // Or encrypt each field.
        // Let's stick to plain text for V1 of history sync to ensure it works, unless I see encryptionutils.

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
