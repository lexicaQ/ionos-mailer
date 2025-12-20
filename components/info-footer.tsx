"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Shield, Lock, Cloud, Server, HardDrive,
    ChevronDown, ChevronUp, ExternalLink, Info
} from "lucide-react"
import { cn } from "@/lib/utils"

interface InfoSection {
    id: string
    title: string
    icon: React.ReactNode
    content: React.ReactNode
}

export function InfoFooter() {
    const [expandedSection, setExpandedSection] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    const sections: InfoSection[] = [
        {
            id: "security",
            title: "Security & Encryption",
            icon: <Shield className="h-4 w-4" />,
            content: (
                <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">Server-Side Encryption:</strong>{" "}
                        All sensitive data (drafts, settings, campaign content, recipients) is encrypted using
                        AES-256-GCM with PBKDF2 key derivation before storage.
                    </p>
                    <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">Authentication:</strong>{" "}
                        Sessions use JWT tokens signed by NextAuth.js with 24-hour expiry.
                        Passwords are hashed with bcrypt before storage.
                    </p>
                    <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">Transport:</strong>{" "}
                        All connections use HTTPS with HSTS enabled. CSP headers prevent XSS attacks.
                    </p>
                </div>
            )
        },
        {
            id: "data",
            title: "Data Storage",
            icon: <HardDrive className="h-4 w-4" />,
            content: (
                <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <div className="grid gap-2">
                        <div className="flex items-start gap-2">
                            <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">Local</span>
                            <span>SMTP settings, history cache (localStorage). Drafts (IndexedDB).</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">Cloud</span>
                            <span>Encrypted drafts, settings, campaigns, email jobs (PostgreSQL via Prisma).</span>
                        </div>
                    </div>
                    <p className="text-xs opacity-75">
                        When signed in, data syncs across devices. Local data is merged with cloud on login.
                    </p>
                </div>
            )
        },
        {
            id: "background",
            title: "Background Delivery",
            icon: <Server className="h-4 w-4" />,
            content: (
                <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">How it works:</strong>{" "}
                        Emails are queued as "jobs" in the database with scheduled times.
                        A cron process (triggered by GitHub Actions or frontend polling) sends
                        pending emails via your SMTP server.
                    </p>
                    <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">Delivery pace:</strong>{" "}
                        Emails are spread over your configured duration (default 60 min) to avoid
                        rate limits and improve deliverability.
                    </p>
                </div>
            )
        },
        {
            id: "privacy",
            title: "Privacy & Third Parties",
            icon: <Lock className="h-4 w-4" />,
            content: (
                <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">Analytics:</strong>{" "}
                        Vercel Analytics is used for basic page view metrics (no personal data).
                    </p>
                    <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">Email Sending:</strong>{" "}
                        Emails are sent directly through your own IONOS SMTP server.
                        No third-party email services process your content.
                    </p>
                    <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">Open Tracking:</strong>{" "}
                        Optional pixel tracking is handled by this app's server. No external trackers.
                    </p>
                </div>
            )
        }
    ]

    const toggleSection = (id: string) => {
        setExpandedSection(expandedSection === id ? null : id)
    }

    return (
        <div className="mt-12 border-t border-neutral-200 dark:border-neutral-800">
            {/* Collapsed Bar */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 px-6 flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
                <Info className="h-4 w-4" />
                <span>How It Works & Security</span>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>

            {/* Expanded Content */}
            {isOpen && (
                <div className="px-6 pb-8 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-w-3xl mx-auto space-y-2">
                        {sections.map((section) => (
                            <div
                                key={section.id}
                                className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
                            >
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className={cn(
                                        "w-full px-4 py-3 flex items-center justify-between text-left",
                                        "hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors",
                                        expandedSection === section.id && "bg-neutral-50 dark:bg-neutral-900"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
                                            {section.icon}
                                        </div>
                                        <span className="font-medium text-sm">{section.title}</span>
                                    </div>
                                    {expandedSection === section.id ? (
                                        <ChevronUp className="h-4 w-4 text-neutral-400" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-neutral-400" />
                                    )}
                                </button>
                                {expandedSection === section.id && (
                                    <div className="px-4 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                                        {section.content}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-xs text-neutral-400 pt-4">
                        Built with Next.js • Open Source •
                        <a
                            href="https://github.com/lexicaQ/ionos-mailer"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 ml-1 hover:text-neutral-600 dark:hover:text-neutral-300"
                        >
                            View on GitHub <ExternalLink className="h-3 w-3" />
                        </a>
                    </p>
                </div>
            )}
        </div>
    )
}
