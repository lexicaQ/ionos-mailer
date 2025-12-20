"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Lock, Shield, Cloud, Zap, Eye, Mail,
    Server, Database, CheckCircle, ChevronDown, ChevronUp,
    Clock, Users, FileText, X
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeatureItem {
    icon: React.ElementType
    title: string
    description: string
}

const securityFeatures: FeatureItem[] = [
    {
        icon: Lock,
        title: "AES-256-GCM Encryption",
        description: "All sensitive data (emails, recipients, SMTP credentials) encrypted using military-grade AES-256-GCM with PBKDF2 key derivation (100,000 iterations)."
    },
    {
        icon: Shield,
        title: "Zero-Knowledge Architecture",
        description: "Your email content is encrypted before storage. Even with database access, data remains unreadable without your unique encryption key."
    },
    {
        icon: Server,
        title: "Your Own SMTP",
        description: "Emails sent through your personal IONOS account. No third-party servers see your content. Full control over your sending reputation."
    },
]

const appFeatures: FeatureItem[] = [
    {
        icon: Clock,
        title: "Background Scheduling",
        description: "Schedule campaigns to send over hours/days. Emails process automatically via GitHub Actions cron, even with browser closed."
    },
    {
        icon: Eye,
        title: "Open Tracking",
        description: "Invisible tracking pixel embedded in emails. See exactly when and how many times recipients open your messages."
    },
    {
        icon: Users,
        title: "Duplicate Prevention",
        description: "Automatic detection of previously contacted recipients. Prevents accidental spam and maintains professionalism."
    },
    {
        icon: Cloud,
        title: "Cross-Device Sync",
        description: "Drafts, settings, and history sync securely across all your devices when logged in."
    },
]

function FeatureSection({ title, features }: { title: string; features: FeatureItem[] }) {
    return (
        <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {title}
            </h4>
            <div className="grid gap-3">
                {features.map((feature) => (
                    <div key={feature.title} className="flex gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                        <div className="h-8 w-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center shrink-0">
                            <feature.icon className="h-4 w-4 text-white dark:text-black" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{feature.title}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-0.5">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function SecurityExplainer() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Floating Trigger Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-40 gap-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-lg hover:shadow-xl transition-shadow"
            >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security & Features</span>
                <span className="sm:hidden">Info</span>
            </Button>

            {/* Slide-up Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-hidden rounded-t-2xl bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 shadow-2xl"
                        >
                            {/* Header */}
                            <div className="sticky top-0 z-10 bg-white dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-900">
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
                                            <Lock className="h-5 w-5 text-white dark:text-black" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Security & Features</h3>
                                            <p className="text-xs text-neutral-500">How IONOS Mailer keeps your data safe</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6 space-y-8">
                                {/* Data Flow Visualization */}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 border border-neutral-200 dark:border-neutral-800">
                                    <div className="flex items-center justify-between gap-4 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                                                <FileText className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                                            </div>
                                            <span className="text-[10px] font-medium text-neutral-500 uppercase">Your Data</span>
                                        </div>

                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="h-0.5 flex-1 bg-neutral-300 dark:bg-neutral-700" />
                                            <Lock className="h-4 w-4 mx-2 text-neutral-400" />
                                            <div className="h-0.5 flex-1 bg-neutral-300 dark:bg-neutral-700" />
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center">
                                                <Database className="h-5 w-5 text-white dark:text-black" />
                                            </div>
                                            <span className="text-[10px] font-medium text-neutral-500 uppercase">Encrypted Storage</span>
                                        </div>

                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="h-0.5 flex-1 bg-neutral-300 dark:bg-neutral-700" />
                                            <Zap className="h-4 w-4 mx-2 text-neutral-400" />
                                            <div className="h-0.5 flex-1 bg-neutral-300 dark:bg-neutral-700" />
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                                                <Mail className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                                            </div>
                                            <span className="text-[10px] font-medium text-neutral-500 uppercase">Your SMTP</span>
                                        </div>
                                    </div>
                                </div>

                                <FeatureSection title="Security" features={securityFeatures} />
                                <FeatureSection title="Features" features={appFeatures} />

                                {/* Footer */}
                                <div className="text-center pt-4 border-t border-neutral-100 dark:border-neutral-900">
                                    <p className="text-xs text-neutral-400">
                                        Built with privacy-first design. Your data never leaves your control.
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
