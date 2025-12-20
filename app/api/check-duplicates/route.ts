import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { recipients } = await request.json()
        if (!Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ duplicates: [] })
        }

        // Normalize inputs
        const inputs = new Set(recipients.map((r: string) => r.toLowerCase()))

        // 1. Check SentEmail (History)
        const sentEmails = await prisma.sentEmail.findMany({
            where: { userId: session.user.id },
            select: { recipients: true },
            orderBy: { sentAt: 'desc' },
            take: 100 // Optimization: Check last 100 batches only to improve speed
        })

        const duplicates = new Set<string>()

        // SentEmail recipients are stored as JSON stirngs
        for (const record of sentEmails) {
            try {
                const recList = JSON.parse(record.recipients)
                if (Array.isArray(recList)) {
                    for (const r of recList) {
                        // SentEmail recipient objects might be { email: "..." } or strings?
                        // EmailForm:214 sends `results` (SendResult[]).
                        // SendResult has { email, success, ... }.
                        // Wait, let's verify SentEmail.recipients structure in `components/history-modal.tsx` or saving logic.
                        // EmailForm:220 saves `recipientList`. 
                        // `saveHistoryToServer` likely saves this.
                        // Needs verification.
                        if (inputs.has(r.email?.toLowerCase())) duplicates.add(r.email)
                        else if (typeof r === 'string' && inputs.has(r.toLowerCase())) duplicates.add(r)
                    }
                }
            } catch (e) { }
        }

        // 2. Check CampaignJob (Background Campaigns)
        // 2. Check CampaignJob (Background Campaigns) - Decrypt to check
        const secretKey = process.env.ENCRYPTION_KEY;
        if (secretKey) {
            const jobs = await prisma.emailJob.findMany({
                where: {
                    campaign: { userId: session.user.id }
                },
                orderBy: { createdAt: 'desc' },
                take: 1000, // Check last 1000 emails
                select: { recipient: true }
            });

            const { decrypt } = await import("@/lib/encryption");

            for (const job of jobs) {
                try {
                    const decrypted = decrypt(job.recipient, secretKey).toLowerCase();
                    if (inputs.has(decrypted)) {
                        duplicates.add(decrypted);
                    }
                } catch (e) {
                    // Ignore legacy plain text or decryption failures
                    if (inputs.has(job.recipient.toLowerCase())) {
                        duplicates.add(job.recipient.toLowerCase());
                    }
                }
            }
        }

        return NextResponse.json({ duplicates: Array.from(duplicates) })

    } catch (error) {
        console.error("Duplicate check failed:", error)
        return NextResponse.json({ error: "Check failed" }, { status: 500 })
    }
}
