import { generateAuthenticationOptions } from "@simplewebauthn/server"
import { prisma } from "@/lib/prisma"

const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost"

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}))
    const { email } = body

    // Clean up expired challenges
    await prisma.authChallenge.deleteMany({
        where: { expiresAt: { lt: new Date() } }
    })

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
        rpID: RP_ID,
        userVerification: "required",
        allowCredentials
    })

    // Store challenge
    await prisma.authChallenge.create({
        data: {
            challenge: options.challenge,
            type: "authentication",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
    })

    return Response.json(options)
}

