"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Lock, Server, Eye, X, ChevronUp, Database, Mail, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SecurityInfoPanel() {
    const [isOpen, setIsOpen] = useState(false)

    const features = [
        {
            icon: Lock,
            title: "AES-256-GCM Encryption",
            description: "All campaign data encrypted at rest using military-grade encryption with PBKDF2 key derivation (100,000 iterations)."
        },
        {
            icon: Database,
            title: "Secure Storage",
            description: "Data stored in PostgreSQL via Prisma ORM. Local drafts in browser storage, synced to cloud when authenticated."
        },
        {
            icon: Mail,
            title: "Direct SMTP Delivery",
            description: "Emails sent directly via TLS-encrypted connection to your IONOS SMTP server. No intermediary services."
        },
        {
            icon: Server,
            title: "Managed Serverless Infrastructure",
            description: "No servers to manage. Powered by Vercel Edge Network for global low-latency performance."
        },
        {
            icon: Clock,
            title: "Automated Cron Jobs",
            description: "Reliable background processing via cron-job.org (external trigger) ensuring campaigns run even when your device is off."
        },
        {
            icon: Eye,
            title: "Private Open Tracking",
            description: "Optional 1x1 pixel tracking. Data remains strictly yours—no third-party analytic trackers involved."
        }
    ]

    return (
        <>
            {/* Trigger Button - Fixed Bottom */}
            <motion.div
                className="fixed bottom-4 left-4 z-50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
            >
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className="gap-2 bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 shadow-lg hover:shadow-xl transition-shadow"
                >
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Security</span>
                </Button>
            </motion.div>

            {/* Panel Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-50"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-900">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-black dark:bg-white rounded-xl flex items-center justify-center">
                                        <Shield className="h-5 w-5 text-white dark:text-black" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Security and Privacy</h3>
                                        <p className="text-xs text-muted-foreground">How your data is protected</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                    className="h-8 w-8"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="p-4 overflow-y-auto max-h-[60vh]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {features.map((feature, i) => (
                                        <motion.div
                                            key={feature.title}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/50"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-black dark:bg-white flex items-center justify-center shrink-0">
                                                    <feature.icon className="h-4 w-4 text-white dark:text-black" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="font-semibold text-sm">{feature.title}</h4>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                        {feature.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Footer Note */}
                                <div className="mt-6 p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                    <p className="text-xs text-muted-foreground text-center">
                                        IONOS Mailer is designed with privacy-first principles. All processing happens on Vercel Edge infrastructure. No data is shared with third parties.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
