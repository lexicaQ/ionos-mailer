import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'

const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'
const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id

        // Get challenge from cookie
        const expectedChallenge = req.cookies.get('webauthn_challenge')?.value
        if (!expectedChallenge) {
            return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 })
        }

        const body = await req.json() as {
            response: RegistrationResponseJSON
            deviceName?: string
        }

        const verification = await verifyRegistrationResponse({
            response: body.response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: false,
        })

        if (!verification.verified || !verification.registrationInfo) {
            return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
        }

        const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

        // Store the passkey in database
        await prisma.passkey.create({
            data: {
                userId,
                credentialId: Buffer.from(credentialID).toString('base64url'),
                publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
                counter: BigInt(counter),
                transports: body.response.response.transports
                    ? JSON.stringify(body.response.response.transports)
                    : null,
                deviceName: body.deviceName || `${credentialDeviceType}${credentialBackedUp ? ' (synced)' : ''}`,
            }
        })

        // Clear the challenge cookie
        const response = NextResponse.json({
            success: true,
            message: 'Passkey registered successfully'
        })
        response.cookies.delete('webauthn_challenge')

        return response
    } catch (error) {
        console.error('Passkey registration verify error:', error)
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
    }
}
