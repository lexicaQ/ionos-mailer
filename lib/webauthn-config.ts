// Production domain - this is your canonical URL
const PRODUCTION_DOMAIN = "ionos-mailer.vercel.app"

export function getWebAuthnConfig() {
    // Priority: manual env > production domain (hardcoded)
    // VERCEL_URL is NOT used because it returns deployment-specific URLs like 
    // "ionos-mailer-abc123.vercel.app" which don't match your canonical domain
    const rpID = process.env.WEBAUTHN_RP_ID || PRODUCTION_DOMAIN

    // Origin must match the exact URL in the browser
    let origin = process.env.WEBAUTHN_ORIGIN || `https://${PRODUCTION_DOMAIN}`

    // Handle localhost for development
    if (process.env.NODE_ENV === "development" || origin.includes("localhost")) {
        return {
            rpName: "IONOS Mailer",
            rpID: "localhost",
            origin: "http://localhost:3000"
        }
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
