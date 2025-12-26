import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ campaignId: string }> }
) {
    try {
        // Await params in Next.js 15+
        const { campaignId } = await params

        // Get all jobs for this campaign
        const jobs = await prisma.emailJob.findMany({
            where: { campaignId },
            select: {
                surveyResponse: true
            }
        })

        const total = jobs.length
        const responses = jobs.filter(j => j.surveyResponse !== null)

        const stats = {
            yes: responses.filter(j => j.surveyResponse === 'yes').length,
            maybe: responses.filter(j => j.surveyResponse === 'maybe').length,
            no: responses.filter(j => j.surveyResponse === 'no').length,
            total: responses.length,
            responseRate: total > 0 ? (responses.length / total) * 100 : 0
        }

        return Response.json(stats)
    } catch (error) {
        console.error('Survey stats error:', error)
        return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
