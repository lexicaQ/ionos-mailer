import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: List user's passkeys
export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const passkeys = await prisma.passkey.findMany({
        where: { userId: session.user.id },
        select: {
            id: true,
            name: true,
            deviceType: true,
            backedUp: true,
            lastUsedAt: true,
            createdAt: true
        },
        orderBy: { createdAt: "desc" }
    })

    return Response.json({ passkeys })
}

// DELETE: Remove a passkey
export async function DELETE(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { passkeyId } = await req.json()

    if (!passkeyId) {
        return Response.json({ error: "Passkey ID required" }, { status: 400 })
    }

    // Verify ownership
    const passkey = await prisma.passkey.findFirst({
        where: { id: passkeyId, userId: session.user.id }
    })

    if (!passkey) {
        return Response.json({ error: "Passkey not found" }, { status: 404 })
    }

    await prisma.passkey.delete({ where: { id: passkeyId } })

    return Response.json({ deleted: true })
}

// PATCH: Rename a passkey
export async function PATCH(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { passkeyId, name } = await req.json()

    if (!passkeyId) {
        return Response.json({ error: "Passkey ID required" }, { status: 400 })
    }

    // Verify ownership
    const passkey = await prisma.passkey.findFirst({
        where: { id: passkeyId, userId: session.user.id }
    })

    if (!passkey) {
        return Response.json({ error: "Passkey not found" }, { status: 404 })
    }

    await prisma.passkey.update({
        where: { id: passkeyId },
        data: { name: name || null }
    })

    return Response.json({ updated: true })
}
