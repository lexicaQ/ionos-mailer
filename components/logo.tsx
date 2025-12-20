"use client"

import { useTheme } from "next-themes"
import Image from "next/image"
import { useEffect, useState } from "react"

export function Logo({ className = "" }: { className?: string }) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className={className} />
    }

    return (
        <div className={`relative ${className}`}>
            <Image
                src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                alt="IONOS Mailer"
                fill
                className="object-contain"
                priority
            />
        </div>
    )
}
