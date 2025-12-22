"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Lock, Server, Eye, X, ChevronUp, Database, Mail, Cloud, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SecurityInfoPanel() {
    const [isOpen, setIsOpen] = useState(false)

    const features = [
        {
            icon: Lock,
            title: "End-to-End Encryption",
            description: "Your emails and drafts are encrypted using AES-256-GCM, the same standard used by banks and governments. Each record gets a unique cryptographic salt, making brute-force attacks virtually impossible."
        },
        {
            icon: Database,
            title: "Zero-Knowledge Architecture",
            description: "Encryption keys are derived on your device using your credentials. The server only stores encrypted blobs—even we cannot read your content without your password."
        },
        {
            icon: Shield,
            title: "PBKDF2 Key Derivation",
            description: "Your password is strengthened through 100,000 iterations of PBKDF2-SHA512 before being used as an encryption key. This makes password guessing attacks impractical."
        },
        {
            icon: Server,
            title: "TLS-Only Communication",
            description: "All connections use HTTPS with HTTP Strict Transport Security (HSTS) enforced for 2 years. Your data never travels unencrypted."
        },
        {
            icon: Shield,
            title: "Content Security Policy",
            description: "A strict CSP header prevents cross-site scripting (XSS) and code injection attacks. Only trusted sources can load scripts and styles."
        },
        {
            icon: Lock,
            title: "Secure Session Management",
            description: "JWT tokens with secure, HTTP-only cookies. Sessions auto-expire, and passkey authentication adds phishing-resistant biometric login."
        },
        {
            icon: Eye,
            title: "Bot & Scraper Protection",
            description: "Middleware blocks known malicious bots (GPTBot, CCBot, etc.) and suspicious user agents. Rate limiting prevents abuse."
        },
        {
            icon: Mail,
            title: "Direct SMTP Delivery",
            description: "Emails are sent directly from your browser to your IONOS SMTP server over TLS. No intermediary servers see your content."
        },
        {
            icon: Cloud,
            title: "Privacy-First Analytics",
            description: "Optional open tracking uses a 1x1 pixel—no Google Analytics or third-party trackers. All analytics data stays on Vercel infrastructure."
        },
        {
            icon: Clock,
            title: "GDPR Compliant",
            description: "Data is stored on EU servers. You can export or delete your data anytime. No data sharing with third parties."
        }
    ]

    return (
        <>
            {/* Trigger Button - Fixed Bottom */}
            <motion.div
                className="fixed top-[18px] left-1/2 -translate-x-1/2 sm:translate-x-0 sm:top-auto sm:left-4 sm:bottom-4 z-50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
            >
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className="gap-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-lg hover:shadow-xl transition-shadow"
                >
                    <Shield className="h-4 w-4" />
                    <span className="inline">Security</span>
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
