import { verifyRegistrationResponse } from "@simplewebauthn/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getWebAuthnConfig } from "@/lib/webauthn-config"

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rpID, origin } = getWebAuthnConfig()

    const body = await req.json()

    // Retrieve and validate challenge
    const storedChallenge = await prisma.authChallenge.findFirst({
        where: {
            userId: session.user.id,
            type: "registration",
            expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
    })

    if (!storedChallenge) {
        return Response.json({ error: "Challenge expired or not found" }, { status: 400 })
    }

    try {
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: storedChallenge.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: true
        })

        if (!verification.verified || !verification.registrationInfo) {
            return Response.json({ error: "Verification failed" }, { status: 400 })
        }

        const {
            credentialID,
            credentialPublicKey,
            counter,
            credentialDeviceType,
            credentialBackedUp
        } = verification.registrationInfo

        // Store passkey
        await prisma.passkey.create({
            data: {
                userId: session.user.id,
                credentialId: Buffer.from(credentialID).toString("base64url"),
                publicKey: Buffer.from(credentialPublicKey),
                counter: counter,
                deviceType: credentialDeviceType,
                backedUp: credentialBackedUp,
                transports: body.response?.transports || [],
                name: body.deviceName || null
            }
        })

        // Delete used challenge
        await prisma.authChallenge.delete({ where: { id: storedChallenge.id } })

        return Response.json({ verified: true })
    } catch (error) {
        console.error("Passkey registration verification failed:", error)
        return Response.json({ error: "Verification failed" }, { status: 400 })
    }
}

