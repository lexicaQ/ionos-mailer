import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types'

// RP Configuration - use environment variables in production
const rpName = process.env.NEXT_PUBLIC_RP_NAME || 'IONOS Mailer'
const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id
        const userEmail = session.user.email || ''
        const userName = session.user.name || userEmail

        // Get existing passkeys for this user to exclude
        const existingPasskeys = await prisma.passkey.findMany({
            where: { userId },
            select: { credentialId: true, transports: true }
        })

        const excludeCredentials = existingPasskeys.map((pk: { credentialId: string; transports: string | null }) => ({
            id: pk.credentialId,
            type: 'public-key' as const,
            transports: pk.transports ? JSON.parse(pk.transports) as AuthenticatorTransportFuture[] : undefined,
        })) as any // Type assertion for SimpleWebAuthn v9+ compatibility

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: userId,
            userName: userEmail,
            userDisplayName: userName,
            attestationType: 'none',
            excludeCredentials,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        })

        // Store challenge in a cookie for verification (short-lived)
        const response = NextResponse.json(options)
        response.cookies.set('webauthn_challenge', options.challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 300,
            path: '/',
        })

        return response
    } catch (error) {
        console.error('Passkey registration options error:', error)
        return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 })
    }
}
