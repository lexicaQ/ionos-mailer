import { generateRegistrationOptions } from "@simplewebauthn/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getWebAuthnConfig } from "@/lib/webauthn-config"

export async function POST() {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rpName, rpID } = getWebAuthnConfig()

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { passkeys: true }
    })

    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 })
    }

    // Clean up expired challenges
    await prisma.authChallenge.deleteMany({
        where: { expiresAt: { lt: new Date() } }
    })

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: user.id,
        userName: user.email,
        userDisplayName: user.name || user.email,
        attestationType: "none",
        excludeCredentials: user.passkeys.map((pk: { credentialId: string; transports: string[] }) => ({
            type: "public-key" as const,
            id: Buffer.from(pk.credentialId, "base64url"),
            transports: pk.transports as any[]
        })),
        authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
            authenticatorAttachment: "platform"
        }
    })

    // Store challenge
    await prisma.authChallenge.create({
        data: {
            challenge: options.challenge,
            userId: session.user.id,
            type: "registration",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
    })

    return Response.json(options)
}

