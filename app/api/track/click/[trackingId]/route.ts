import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { searchParams } = new URL(request.url)
  const encodedUrl = searchParams.get("url")
  
  if (!encodedUrl) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Decode the destination URL
  let destinationUrl: string
  try {
    destinationUrl = Buffer.from(encodedUrl, "base64").toString("utf-8")
  } catch {
    return NextResponse.redirect(new URL("/", request.url))
  }

  try {
    const { trackingId } = await params

    // Find the email job and create a click record
    const emailJob = await prisma.emailJob.findUnique({
      where: { trackingId },
    })

    if (emailJob) {
      await prisma.click.create({
        data: {
          emailJobId: emailJob.id,
          url: destinationUrl,
        },
      })
    }
  } catch (error) {
    console.error("Click tracking error:", error)
  }

  // Redirect to destination
  return NextResponse.redirect(destinationUrl)
}
