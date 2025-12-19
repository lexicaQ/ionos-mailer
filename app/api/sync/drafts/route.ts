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

        let draft;

        // Check if draft with this ID already exists
        const existing = id ? await prisma.draft.findUnique({ where: { id } }) : null;

        if (existing) {
            // Verify ownership
            if (existing.userId !== session.user.id) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
            }
            // Update existing draft
            draft = await prisma.draft.update({
                where: { id },
                data
            })
        } else {
            // Create new draft (with client ID if provided)
            draft = await prisma.draft.create({
                data: {
                    ...data,
                    id: id || undefined,
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
