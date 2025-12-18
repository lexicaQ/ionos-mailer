import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { generatePasskeyRegistrationOptions, verifyPasskeyRegistration } from "@/lib/webauthn"
import { prisma } from "@/lib/prisma"

// Database-backed challenge store
// DELETE: InMemory store

// GET: Generate registration options
export async function GET(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const url = new URL(request.url)
        // RpID is the hostname (without port)
        const rpID = url.hostname

        const options = await generatePasskeyRegistrationOptions(
            session.user.id,
            session.user.email,
            rpID
        )

        // Store challenge for verification in DB
        await prisma.passkeyChallenge.upsert({
            where: { userId: session.user.id },
            create: {
                userId: session.user.id,
                challenge: options.challenge,
            },
            update: {
                challenge: options.challenge,
                createdAt: new Date(), // Refresh timestamp
            }
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

        // Get stored challenge from DB
        const storedChallenge = await prisma.passkeyChallenge.findUnique({
            where: { userId: session.user.id }
        })

        if (!storedChallenge) {
            return NextResponse.json({ error: "Challenge expired or not found" }, { status: 400 })
        }

        const origin = request.headers.get("origin") || request.headers.get("referer") || ""
        const url = new URL(request.url)
        const rpID = url.hostname

        // Verify registration
        const result = await verifyPasskeyRegistration(
            session.user.id,
            response,
            storedChallenge.challenge,
            rpID,
            origin,
            deviceName
        )

        // Clean up challenge
        await prisma.passkeyChallenge.delete({
            where: { userId: session.user.id }
        })

        if (!result.verified) {
            return NextResponse.json({ error: "Verification failed" }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            passkeyId: result.passkeyId,
        })
    } catch (error: any) {
        console.error("Error verifying passkey:", error)
        return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 })
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
