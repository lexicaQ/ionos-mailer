import { verifyAuthenticationResponse } from "@simplewebauthn/server"
import { prisma } from "@/lib/prisma"
import { getWebAuthnConfig } from "@/lib/webauthn-config"

export async function POST(req: Request) {
    const { rpID, origin } = getWebAuthnConfig()
    const body = await req.json()

    // Find passkey by credential ID
    const credentialId = body.id

    const passkey = await prisma.passkey.findUnique({
        where: { credentialId },
        include: { user: true }
    })

    if (!passkey) {
        return Response.json({ error: "Passkey not found" }, { status: 400 })
    }

    // Find the most recent authentication challenge
    const storedChallenge = await prisma.authChallenge.findFirst({
        where: {
            type: "authentication",
            expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
    })

    if (!storedChallenge) {
        return Response.json({ error: "Challenge expired or not found" }, { status: 400 })
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

        // Delete used challenge
        await prisma.authChallenge.delete({ where: { id: storedChallenge.id } })

        // Return user info for session creation
        return Response.json({
            verified: true,
            user: {
                id: passkey.user.id,
                email: passkey.user.email,
                name: passkey.user.name
            }
        })
    } catch (error) {
        console.error("Passkey authentication verification failed:", error)
        return Response.json({ error: "Verification failed" }, { status: 400 })
    }
}
