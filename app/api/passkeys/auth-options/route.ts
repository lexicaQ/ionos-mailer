import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { prisma } from "@/lib/prisma"
import { getWebAuthnConfig } from "@/lib/webauthn-config"
import crypto from 'crypto'

export async function POST(req: Request) {
    const { rpID } = getWebAuthnConfig()
    const body = await req.json().catch(() => ({}))
    const { email } = body

    // Clean up expired challenges (NON-BLOCKING - don't wait)
    // This prevents slow DB queries from delaying the passkey prompt
    prisma.authChallenge.deleteMany({
        where: { expiresAt: { lt: new Date() } }
    }).catch(() => { }) // Ignore errors, cleanup is best-effort

    let allowCredentials: any[] | undefined = undefined

    // If email provided, get user's passkeys
    if (email) {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { passkeys: true }
        })

        if (user?.passkeys.length) {
            allowCredentials = user.passkeys.map((pk: any) => ({
                type: "public-key" as const,
                id: Buffer.from(pk.credentialId, "base64url"),
                transports: pk.transports
            }))
        }
    }


    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "required",
        allowCredentials
    })

    // Generate a unique challengeId to bind this challenge
    // This prevents cross-user race conditions
    const challengeId = crypto.randomUUID()

    // Store challenge with the challengeId
    await prisma.authChallenge.create({
        data: {
            id: challengeId, // Use our generated ID
            challenge: options.challenge,
            type: "authentication",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
    })

    // Return challengeId to client for verification
    return Response.json({ ...options, challengeId })
}

