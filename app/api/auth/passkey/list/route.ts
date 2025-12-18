import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// GET: List user's passkeys
export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const passkeys = await prisma.passkey.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                deviceName: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ passkeys })
    } catch (error: any) {
        console.error("Error fetching passkeys:", error)
        return NextResponse.json({ error: "Failed to fetch passkeys" }, { status: 500 })
    }
}
