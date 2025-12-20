import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAuthenticationOptions } from '@simplewebauthn/server'

const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const email = body.email?.toLowerCase().trim()

        // If email provided, get only that user's passkeys
        // Otherwise, allow any passkey (discoverable credentials)
        let userPasskeys: { credentialId: string; transports: string | null }[] = []

        if (email) {
            const user = await prisma.user.findUnique({
                where: { email },
                include: { passkeys: { select: { credentialId: true, transports: true } } }
            })

            if (user?.passkeys?.length) {
                userPasskeys = user.passkeys
            }
        }

        // Build allowCredentials - use type assertion since SimpleWebAuthn v9+ 
        // accepts base64url strings at runtime but types expect BufferSource
        const allowCredentials = userPasskeys.length > 0
            ? userPasskeys.map(pk => ({
                id: pk.credentialId,
                type: 'public-key' as const,
                transports: pk.transports ? JSON.parse(pk.transports) : undefined,
            })) as any // Type assertion needed for v9+ library type mismatch
            : undefined

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials,
            userVerification: 'preferred',
        })

        // Store challenge in cookie
        const response = NextResponse.json(options)
        response.cookies.set('webauthn_auth_challenge', options.challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 300,
            path: '/',
        })

        return response
    } catch (error) {
        console.error('Passkey auth options error:', error)
        return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 })
    }
}
