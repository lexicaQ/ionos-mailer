import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const passkeys = await prisma.passkey.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                deviceName: true,
                createdAt: true,
                lastUsedAt: true,
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ passkeys })
    } catch (error) {
        console.error('Passkey list error:', error)
        return NextResponse.json({ error: 'Failed to fetch passkeys' }, { status: 500 })
    }
}
