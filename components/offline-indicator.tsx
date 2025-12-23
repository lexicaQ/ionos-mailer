"use client"

import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false)

    useEffect(() => {
        // Check initial status
        setIsOffline(!navigator.onLine)

        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [])

    if (!isOffline) return null

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 text-white text-sm font-semibold shadow-lg">
                <WifiOff className="h-4 w-4" />
                <span>You are offline</span>
            </div>
        </div>
    )
}
