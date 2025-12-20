import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'
const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
    try {
        const expectedChallenge = req.cookies.get('webauthn_auth_challenge')?.value
        if (!expectedChallenge) {
            return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 })
        }

        const body = await req.json() as { response: AuthenticationResponseJSON }
        const { response } = body

        // Find the passkey by credential ID (the response.id is already base64url)
        const passkey = await prisma.passkey.findUnique({
            where: { credentialId: response.id },
            include: { user: true }
        })

        if (!passkey) {
            return NextResponse.json({ error: 'Passkey not found' }, { status: 400 })
        }

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: Buffer.from(passkey.credentialId, 'base64url'),
                credentialPublicKey: Buffer.from(passkey.publicKey, 'base64url'),
                counter: Number(passkey.counter),
            },
            requireUserVerification: false,
        })

        if (!verification.verified) {
            return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
        }

        // Update counter and lastUsedAt
        await prisma.passkey.update({
            where: { id: passkey.id },
            data: {
                counter: BigInt(verification.authenticationInfo.newCounter),
                lastUsedAt: new Date(),
            }
        })

        // Create a simple JWT session token matching NextAuth format
        const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ''
        const token = jwt.sign(
            {
                id: passkey.user.id,
                email: passkey.user.email,
                name: passkey.user.name,
                sub: passkey.user.id,
            },
            secret,
            { expiresIn: '24h' }
        )

        // Set session cookie (NextAuth v5 uses authjs.session-token)
        const cookieStore = await cookies()
        cookieStore.set('authjs.session-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60,
            path: '/',
        })

        // Clear challenge cookie
        const res = NextResponse.json({
            success: true,
            user: {
                id: passkey.user.id,
                email: passkey.user.email,
                name: passkey.user.name,
            }
        })
        res.cookies.delete('webauthn_auth_challenge')

        return res
    } catch (error) {
        console.error('Passkey auth verify error:', error)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }
}
