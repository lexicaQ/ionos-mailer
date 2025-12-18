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
            select: { recipients: true }
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
        const jobs = await prisma.emailJob.findMany({
            where: {
                campaign: { userId: session.user.id },
                recipient: { in: Array.from(inputs) } // Optimization: specific check
            },
            select: { recipient: true }
        })

        for (const job of jobs) {
            if (inputs.has(job.recipient.toLowerCase())) {
                duplicates.add(job.recipient)
            }
        }

        return NextResponse.json({ duplicates: Array.from(duplicates) })

    } catch (error) {
        console.error("Duplicate check failed:", error)
        return NextResponse.json({ error: "Check failed" }, { status: 500 })
    }
}
