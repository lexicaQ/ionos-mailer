"use client"

import { BotIdClient } from "botid/client"

/**
 * BotID Protection Component
 * Protects user-facing routes from bot attacks
 * 
 * NOTE: /api/cron/process is NOT protected to allow external cron-job.org to work!
 */
export function BotIdProtection() {
    return (
        <BotIdClient
            protect={[
                // Auth routes
                { path: "/api/auth/*", method: "*" },
                { path: "/api/passkeys/*", method: "*" },

                // User-facing APIs
                { path: "/api/send-emails", method: "POST" },
                { path: "/api/campaigns", method: "*" },
                { path: "/api/campaigns/*/cancel", method: "PATCH" },

                // Sync routes
                { path: "/api/sync/*", method: "*" },

                // History & Drafts
                { path: "/api/history", method: "*" },

                // IMPORTANT: /api/cron/process is NOT listed here!
                // This allows cron-job.org to call it without being blocked
            ]}
        />
    )
}
