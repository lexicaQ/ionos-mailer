import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await req.json()
        if (!id) {
            return NextResponse.json({ error: 'Passkey ID required' }, { status: 400 })
        }

        // Verify ownership before deleting
        const passkey = await prisma.passkey.findFirst({
            where: { id, userId: session.user.id }
        })

        if (!passkey) {
            return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
        }

        await prisma.passkey.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Passkey delete error:', error)
        return NextResponse.json({ error: 'Failed to delete passkey' }, { status: 500 })
    }
}
