export function getWebAuthnConfig() {
    const rpID = process.env.WEBAUTHN_RP_ID || process.env.NEXT_PUBLIC_VERCEL_URL || "localhost"

    // Ensure origin has protocol
    let origin = process.env.WEBAUTHN_ORIGIN || `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` || "http://localhost:3000"
    if (origin.includes("localhost") && !origin.startsWith("http")) {
        origin = `http://${origin}`
    } else if (!origin.startsWith("http")) {
        origin = `https://${origin}`
    }

    // Strip trailing slash if present
    if (origin.endsWith("/")) {
        origin = origin.slice(0, -1)
    }

    return {
        rpName: "IONOS Mailer",
        rpID,
        origin
    }
}
