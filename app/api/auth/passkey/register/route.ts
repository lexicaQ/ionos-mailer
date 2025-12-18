import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { generatePasskeyRegistrationOptions, verifyPasskeyRegistration } from "@/lib/webauthn"
import { prisma } from "@/lib/prisma"

// In-memory challenge store (use Redis in production)
const challengeStore = new Map<string, { challenge: string; timestamp: number }>()

// Clean up old challenges (older than 5 minutes)
function cleanupChallenges() {
    const now = Date.now()
    for (const [key, value] of challengeStore.entries()) {
        if (now - value.timestamp > 5 * 60 * 1000) {
            challengeStore.delete(key)
        }
    }
}

// GET: Generate registration options
export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        cleanupChallenges()

        const options = await generatePasskeyRegistrationOptions(
            session.user.id,
            session.user.email
        )

        // Store challenge for verification
        challengeStore.set(session.user.id, {
            challenge: options.challenge,
            timestamp: Date.now(),
        })

        return NextResponse.json({ options })
    } catch (error: any) {
        console.error("Error generating passkey options:", error)
        return NextResponse.json({ error: "Failed to generate options" }, { status: 500 })
    }
}

// POST: Verify registration and save passkey
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { response, deviceName } = await request.json()

        // Get stored challenge
        const storedData = challengeStore.get(session.user.id)
        if (!storedData) {
            return NextResponse.json({ error: "Challenge expired" }, { status: 400 })
        }

        // Verify registration
        const result = await verifyPasskeyRegistration(
            session.user.id,
            response,
            storedData.challenge,
            deviceName
        )

        // Clean up challenge
        challengeStore.delete(session.user.id)

        if (!result.verified) {
            return NextResponse.json({ error: "Verification failed" }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            passkeyId: result.passkeyId,
        })
    } catch (error: any) {
        console.error("Error verifying passkey:", error)
        return NextResponse.json({ error: "Verification failed" }, { status: 500 })
    }
}

// DELETE: Remove a passkey
export async function DELETE(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { passkeyId } = await request.json()

        if (!passkeyId) {
            return NextResponse.json({ error: "Passkey ID required" }, { status: 400 })
        }

        // Verify passkey belongs to user
        const passkey = await prisma.passkey.findFirst({
            where: {
                id: passkeyId,
                userId: session.user.id,
            },
        })

        if (!passkey) {
            return NextResponse.json({ error: "Passkey not found" }, { status: 404 })
        }

        await prisma.passkey.delete({
            where: { id: passkeyId },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Error deleting passkey:", error)
        return NextResponse.json({ error: "Failed to delete passkey" }, { status: 500 })
    }
}
