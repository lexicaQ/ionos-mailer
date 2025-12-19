
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"

// GET: Fetch settings
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const settings = await prisma.smtpSettings.findUnique({
            where: { userId: session.user.id }
        })

        if (!settings) {
            return NextResponse.json({ settings: null })
        }

        // Decrypt password before sending to frontend
        let decryptedPass = "";
        try {
            decryptedPass = decrypt(settings.password, process.env.ENCRYPTION_KEY!);
        } catch (e) {
            // If decryption fails, password might already be plain text (legacy)
            decryptedPass = settings.password;
        }

        // Return flattened settings matching SmtpConfig interface
        return NextResponse.json({
            settings: {
                host: settings.host,
                port: settings.port,
                user: settings.email, // Map DB email -> API user
                pass: decryptedPass, // DECRYPTED password
                fromEmail: settings.fromEmail || "",
                fromName: settings.fromName || "",
                replyTo: settings.replyTo || "",
                simulation: false
            }
        })
    } catch (error: any) {
        console.error("Error fetching settings:", error)
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }
}

// POST: Save settings
export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { host, port, user, pass, fromEmail, fromName, replyTo } = body

        // Validate required fields? User might have partial settings.
        // Prisma upsert
        const settings = await prisma.smtpSettings.upsert({
            where: { userId: session.user.id },
            update: {
                host,
                port: Number(port),
                email: user, // Map API user -> DB email
                password: encrypt(pass, process.env.ENCRYPTION_KEY!), // Map API pass -> DB password
                fromEmail,
                fromName,
                replyTo
            },
            create: {
                userId: session.user.id,
                host: host || "",
                port: Number(port) || 587,
                email: user || "",
                password: encrypt(pass || "", process.env.ENCRYPTION_KEY!),
                fromEmail: fromEmail || "",
                fromName: fromName || "",
                replyTo: replyTo || ""
            }
        })

        return NextResponse.json({ success: true, settings })
    } catch (error: any) {
        console.error("Error saving settings:", error)
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
    }
}
