import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getConfirmationPageHtml } from "@/lib/survey-templates"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ trackingId: string; choice: string }> }
) {
    try {
        const { trackingId, choice } = await params
        const decodedChoice = decodeURIComponent(choice).toLowerCase()

        // Validate choice
        const validChoices = ['yes', 'maybe', 'no']
        const isValidChoice = validChoices.includes(decodedChoice) || decodedChoice.length > 0

        if (!isValidChoice) {
            return new NextResponse("Invalid choice", { status: 400 })
        }

        // Update the email job with survey response
        await prisma.emailJob.update({
            where: { trackingId },
            data: {
                surveyChoice: decodedChoice,
                surveyClickedAt: new Date()
            }
        })

        // Return beautiful confirmation page
        const confirmationHtml = getConfirmationPageHtml(decodedChoice)

        return new NextResponse(confirmationHtml, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        })
    } catch (error) {
        console.error("Survey tracking error:", error)

        // Still show a generic thank you page on error
        return new NextResponse(getConfirmationPageHtml('yes'), {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8"
            }
        })
    }
}
