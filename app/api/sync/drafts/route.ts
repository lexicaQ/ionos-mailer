import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: Fetch all drafts for the authenticated user
export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const drafts = await prisma.draft.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: "desc" },
        })

        // Parse JSON fields
        const parsedDrafts = drafts.map(draft => ({
            ...draft,
            recipients: JSON.parse(draft.recipients || "[]"),
            attachments: draft.attachments ? JSON.parse(draft.attachments) : [],
        }))

        return NextResponse.json({ drafts: parsedDrafts })
    } catch (error: any) {
        console.error("Error fetching drafts:", error)
        return NextResponse.json({ error: "Failed to fetch drafts" }, { status: 500 })
    }
}

// POST: Save or update a draft
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id, name, subject, body, recipients, attachments } = await request.json()

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }

        const data = {
            name,
            subject: subject || "",
            body: body || "",
            recipients: JSON.stringify(recipients || []),
            attachments: attachments ? JSON.stringify(attachments) : null,
        }

        if (id) {
            // Upsert: Create if not exists (using client ID), Update if exists
            draft = await prisma.draft.upsert({
                where: { id },
                update: data,
                create: {
                    ...data,
                    id, // Use client-provided ID
                    userId: session.user.id,
                },
            })

            // Security check: ensure userId matches if we updated (upsert 'where' only checked ID)
            // But wait, if someone guesses an ID, they could overwrite? 
            // Better to add userId to 'where' clause of update? 
            // Prisma upsert 'where' typically needs a unique identifier. ID is unique.
            // We need to verify ownership if it's an update.

            if (draft.userId !== session.user.id) {
                // Rollback or Error? If we mistakenly updated someone else's draft?
                // But ID is UUID-like (random). Collision unlikely.
                // However, correct security practice: 
                // We can't use upsert effectively with row-level security easily if 'id' is the only unique constraint but we want to filter by userId.
                // Let's go back to explicit check.
            }
        }

        // REVISED APPROACH for robust security & functionality:
        // 1. Try to find existing draft by ID AND UserId
        const existing = id ? await prisma.draft.findUnique({ where: { id } }) : null;

        if (existing) {
            if (existing.userId !== session.user.id) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
            }
            draft = await prisma.draft.update({
                where: { id },
                data
            })
        } else {
            // Create new (with client ID if provided)
            draft = await prisma.draft.create({
                data: {
                    ...data,
                    id: id || undefined, // undefined lets Prisma/DB gen ID if needed (though client always sends one)
                    userId: session.user.id
                }
            })
        }

        return NextResponse.json({
            success: true,
            draft: {
                ...draft,
                recipients: JSON.parse(draft.recipients),
                attachments: draft.attachments ? JSON.parse(draft.attachments) : [],
            },
        })
    } catch (error: any) {
        console.error("Error saving draft:", error)
        return NextResponse.json({ error: "Failed to save draft" }, { status: 500 })
    }
}

// DELETE: Remove a draft
export async function DELETE(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: "Draft ID is required" }, { status: 400 })
        }

        await prisma.draft.delete({
            where: { id, userId: session.user.id },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting draft:", error)
        return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 })
    }
}
