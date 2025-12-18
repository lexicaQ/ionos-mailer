import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// 1x1 transparent PNG pixel (base64 decoded)
const TRANSPARENT_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params

    // Extract IP address from headers
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : "Unknown"

    // Update the email job with open tracking
    await prisma.emailJob.update({
      where: { trackingId },
      data: {
        openedAt: new Date(),
        openCount: { increment: 1 },
        ipAddress: ip,
      },
    })
  } catch (error) {
    // Silently fail - we don't want to break the email display
    console.error("Tracking error:", error)
  }

  // Always return the pixel
  return new NextResponse(TRANSPARENT_PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  })
}
