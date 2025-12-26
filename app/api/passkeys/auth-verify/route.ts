import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import { prisma } from "@/lib/prisma"
import { getWebAuthnConfig } from "@/lib/webauthn-config"
import { NextResponse } from "next/server"

export async function HEAD() {
    // Lightweight HEAD for server warmup
    return new NextResponse(null, { status: 200 });
}

export async function POST(req: Request) {
    const { rpID, origin } = getWebAuthnConfig()
    const body = await req.json()

    // Require challengeId for proper challenge binding
    const { challengeId } = body
    if (!challengeId) {
        return Response.json({ error: "Challenge ID required" }, { status: 400 })
    }

    // Find passkey by credential ID
    const credentialId = body.id

    const passkey = await prisma.passkey.findUnique({
        where: { credentialId },
        include: { user: true }
    })

    if (!passkey) {
        return Response.json({ error: "Passkey not found" }, { status: 400 })
    }

    // Find challenge by ID (not "most recent" - prevents race conditions)
    const storedChallenge = await prisma.authChallenge.findUnique({
        where: { id: challengeId }
    })

    if (!storedChallenge) {
        return Response.json({ error: "Challenge not found" }, { status: 400 })
    }

    if (storedChallenge.expiresAt < new Date()) {
        // Clean up expired challenge
        await prisma.authChallenge.delete({ where: { id: challengeId } }).catch(() => { })
        return Response.json({ error: "Challenge expired" }, { status: 400 })
    }

    try {
        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: storedChallenge.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: true,
            authenticator: {
                credentialID: Buffer.from(passkey.credentialId, "base64url"),
                credentialPublicKey: passkey.publicKey,
                counter: passkey.counter,
                transports: passkey.transports as any[]
            }
        })

        if (!verification.verified) {
            return Response.json({ error: "Verification failed" }, { status: 400 })
        }

        // Update counter (replay protection)
        await prisma.passkey.update({
            where: { id: passkey.id },
            data: {
                counter: verification.authenticationInfo.newCounter,
                lastUsedAt: new Date()
            }
        })

        // Delete used challenge (one-time use)
        await prisma.authChallenge.delete({ where: { id: storedChallenge.id } })

        // Create a short-lived auth token for NextAuth (avoids re-verification)
        const { createAuthToken } = await import('@/lib/auth-token')
        const authToken = await createAuthToken(passkey.user.id, challengeId)

        // Return user info AND auth token for NextAuth flow
        return Response.json({
            verified: true,
            authToken, // NEW: Token for fast NextAuth login
            user: {
                id: passkey.user.id,
                email: passkey.user.email,
                name: passkey.user.name
            }
        })
    } catch (error) {
        console.error("PASSKEY_AUTH_ERR")
        return Response.json({ error: "Verification failed" }, { status: 400 })
    }
}
