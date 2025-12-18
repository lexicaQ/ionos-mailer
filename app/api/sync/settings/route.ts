import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: Fetch SMTP settings for the authenticated user
export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const settings = await prisma.smtpSettings.findUnique({
            where: { userId: session.user.id },
        })

        if (!settings) {
            return NextResponse.json({ settings: null })
        }

        return NextResponse.json({
            settings: {
                host: settings.host,
                port: settings.port,
                email: settings.email,
                // Don't return password - let client store locally if needed
                fromName: settings.fromName,
                delay: settings.delay,
            },
        })
    } catch (error: any) {
        console.error("Error fetching settings:", error)
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }
}

// POST: Save SMTP settings
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { host, port, email, password, fromName, delay } = await request.json()

        if (!host || !port || !email) {
            return NextResponse.json(
                { error: "Host, port, and email are required" },
                { status: 400 }
            )
        }

        const data = {
            host,
            port: parseInt(port),
            email,
            password: password || "", // Store encrypted in production
            fromName: fromName || null,
            delay: delay || 500,
        }

        const settings = await prisma.smtpSettings.upsert({
            where: { userId: session.user.id },
            update: data,
            create: {
                ...data,
                userId: session.user.id,
            },
        })

        return NextResponse.json({
            success: true,
            settings: {
                host: settings.host,
                port: settings.port,
                email: settings.email,
                fromName: settings.fromName,
                delay: settings.delay,
            },
        })
    } catch (error: any) {
        console.error("Error saving settings:", error)
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
    }
}
