import { NextResponse } from "next/server"
import { generatePasskeyAuthenticationOptions, verifyPasskeyAuthentication } from "@/lib/webauthn"
import { signIn } from "@/auth"

// In-memory challenge store (use Redis in production)
const challengeStore = new Map<string, { challenge: string; timestamp: number }>()

// Clean up old challenges
function cleanupChallenges() {
    const now = Date.now()
    for (const [key, value] of challengeStore.entries()) {
        if (now - value.timestamp > 5 * 60 * 1000) {
            challengeStore.delete(key)
        }
    }
}

// GET: Generate authentication options
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const email = searchParams.get("email")

        // Email is optional now (usernameless login)

        cleanupChallenges()

        const result = await generatePasskeyAuthenticationOptions(email?.toLowerCase().trim())

        if (!result) {
            return NextResponse.json({ error: "No passkeys found for this email" }, { status: 404 })
        }

        const { options, userId } = result

        // If USERNAMELESS, we don't have a userId yet. We need a temporary session ID 
        // to map the challenge to this specific browser session.
        // If we HAVE a userId (email provided), we can use that.
        // Actually, let's just always generate a temporary request ID to be safe and stateless regarding user?
        // But the client expects "userId" field. Let's send a temp ID if userId is undefined.
        const effectiveUserId = userId || `temp_${crypto.randomUUID()}`

        // Store challenge 
        challengeStore.set(effectiveUserId, {
            challenge: options.challenge,
            timestamp: Date.now(),
        })

        return NextResponse.json({ options, userId: effectiveUserId })
    } catch (error: any) {
        console.error("Error generating auth options:", error)
        return NextResponse.json({ error: "Failed to generate options" }, { status: 500 })
    }
}

// POST: Verify authentication and login
export async function POST(request: Request) {
    try {
        const { response, userId } = await request.json()

        // Get stored challenge (using the ID we sent to client)
        const storedData = challengeStore.get(userId)
        if (!storedData) {
            return NextResponse.json({ error: "Challenge expired" }, { status: 400 })
        }

        // Verify passkey
        // Note: verifyPasskeyAuthentication now looks up the user by credentialId in the response
        const result = await verifyPasskeyAuthentication(
            response,
            storedData.challenge
        )

        // Clean up
        challengeStore.delete(userId)

        if (!result.verified || !result.userId || !result.email) {
            return NextResponse.json({ error: "Verification failed" }, { status: 400 })
        }

        // Secure Handoff: Generate a one-time login token
        const loginToken = crypto.randomUUID()
        const expires = new Date(Date.now() + 5 * 60 * 1000) // 5 mins

        // Needed import: prisma
        const { prisma } = await import("@/lib/prisma")

        await prisma.user.update({
            where: { id: result.userId },
            data: {
                loginToken,
                loginTokenExpires: expires
            }
        })

        return NextResponse.json({
            success: true,
            email: result.email,
            loginToken
        })
    } catch (error: any) {
        console.error("Error verifying passkey login:", error)
        return NextResponse.json({ error: "Login failed" }, { status: 500 })
    }
}
