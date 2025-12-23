"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"

/**
 * Preloads campaign data in the background on app mount.
 * This ensures Live Tracker has data instantly when opened.
 */
export function CampaignPreloader() {
    const { data: session } = useSession()

    useEffect(() => {
        // Only preload if user is logged in
        if (!session?.user) return

        const preloadCampaigns = async () => {
            try {
                const res = await fetch("/api/campaigns/status")
                if (res.ok) {
                    const data = await res.json()
                    // Sort by date descending
                    data.sort((a: any, b: any) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                    // Sort jobs chronologically
                    data.forEach((c: any) => {
                        if (c.jobs) {
                            c.jobs.sort((a: any, b: any) => 
                                new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
                            )
                        }
                    })
                    // Cache immediately
                    localStorage.setItem("ionos-mailer-campaigns-cache", JSON.stringify(data))
                    console.log(`[Preloader] Cached ${data.length} campaigns`)
                }
            } catch (e) {
                console.error("[Preloader] Failed to preload campaigns:", e)
            }
        }

        // Preload with small delay to not block initial render
        const timer = setTimeout(preloadCampaigns, 500)
        return () => clearTimeout(timer)
    }, [session])

    return null // Invisible component
}
