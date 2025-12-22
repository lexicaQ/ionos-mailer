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

    // Extract IP address and User-Agent from headers
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : "Unknown"
    const userAgent = request.headers.get("user-agent") || ""

    // Heuristic: Detect automated prefetching by email clients
    // These proxies/scanners load images before the user actually opens the email
    const knownPrefetchBots = [
      'GoogleImageProxy',       // Gmail
      'OutlookProxy',           // Outlook
      'YahooMailProxy',         // Yahoo
      'AppleMailProxy',         // Apple Mail
      'mailgun/tracking',       // Mailgun tracking
      'MailScanner',            // Security scanners
    ]

    const isPrefetchBot = knownPrefetchBots.some(bot =>
      userAgent.toLowerCase().includes(bot.toLowerCase())
    )

    // Try to get the email job to check timing
    const job = await prisma.emailJob.findUnique({
      where: { trackingId },
      select: { sentAt: true, openedAt: true }
    })

    // Only count as genuine open if:
    // 1. Not from a known prefetch bot/proxy
    // 2. At least 30 seconds after email was sent (prefetch usually immediate)
    // 3. Or if already opened before (increment count)
    const shouldCountAsOpen = job && (
      job.openedAt !== null || // Already marked as opened
      (!isPrefetchBot && job.sentAt && (Date.now() - job.sentAt.getTime() > 30000))
    )

    // Update tracking - only set openedAt if it's likely a real open
    if (shouldCountAsOpen) {
      await prisma.emailJob.update({
        where: { trackingId },
        data: {
          openedAt: job?.openedAt || new Date(), // Don't overwrite existing openedAt
          openCount: { increment: 1 },
          ipAddress: ip,
        },
      })
    } else {
      // Just log the prefetch attempt without marking as opened
      console.log(`Prefetch detected: ${trackingId} from ${userAgent}`)
    }
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
