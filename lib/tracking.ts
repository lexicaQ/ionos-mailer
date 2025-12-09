/**
 * Email tracking utilities
 * Injects tracking pixel and rewrites links for click tracking
 */

export function getTrackingPixelUrl(trackingId: string, baseUrl: string): string {
  return `${baseUrl}/api/track/open/${trackingId}/pixel.png`
}

export function getClickTrackingUrl(trackingId: string, originalUrl: string, baseUrl: string): string {
  const encodedUrl = Buffer.from(originalUrl).toString("base64")
  return `${baseUrl}/api/track/click/${trackingId}?url=${encodeURIComponent(encodedUrl)}`
}

/**
 * Inject tracking pixel and rewrite links in HTML email body
 */
export function injectTracking(htmlBody: string, trackingId: string, baseUrl: string): string {
  // Replace all links with tracking links
  let trackedHtml = htmlBody.replace(
    /href=["']([^"']+)["']/gi,
    (match, url) => {
      // Skip mailto, tel, and anchor links
      if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("#")) {
        return match
      }
      const trackingUrl = getClickTrackingUrl(trackingId, url, baseUrl)
      return `href="${trackingUrl}"`
    }
  )

  // Add tracking pixel at the end of the body
  const pixelUrl = getTrackingPixelUrl(trackingId, baseUrl)
  const trackingPixel = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" />`
  
  // Insert before </body> if exists, otherwise append
  if (trackedHtml.includes("</body>")) {
    trackedHtml = trackedHtml.replace("</body>", `${trackingPixel}</body>`)
  } else {
    trackedHtml += trackingPixel
  }

  return trackedHtml
}

/**
 * Convert plain text to simple HTML with tracking
 */
export function textToHtmlWithTracking(text: string, trackingId: string, baseUrl: string): string {
  // Convert newlines to <br> and wrap in basic HTML
  const htmlContent = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
    // Convert URLs to links
    .replace(
      /(https?:\/\/[^\s<]+)/gi,
      (url) => `<a href="${url}">${url}</a>`
    )

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
${htmlContent}
</body>
</html>`

  return injectTracking(html, trackingId, baseUrl)
}
