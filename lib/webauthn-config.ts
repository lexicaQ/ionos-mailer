// WebAuthn Configuration
// In production, WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN must be explicitly set

const PRODUCTION_DOMAIN = "ionos-mailer.vercel.app"

export function getWebAuthnConfig() {
    const isProd = process.env.NODE_ENV === "production"

    // Fail fast in production if env vars not set
    if (isProd) {
        if (!process.env.WEBAUTHN_RP_ID || !process.env.WEBAUTHN_ORIGIN) {
            throw new Error(
                "SECURITY: WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN must be explicitly set in production. " +
                "Set these environment variables in your deployment configuration."
            )
        }
    }

    // Handle localhost for development
    if (process.env.NODE_ENV === "development") {
        return {
            rpName: "IONOS Mailer",
            rpID: "localhost",
            origin: "http://localhost:3000"
        }
    }

    // Production: use explicit env vars (required above)
    const rpID = process.env.WEBAUTHN_RP_ID || PRODUCTION_DOMAIN
    let origin = process.env.WEBAUTHN_ORIGIN || `https://${PRODUCTION_DOMAIN}`

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
