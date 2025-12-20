"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Shield, Lock, Cloud, Server, HardDrive, Info, Share2, Activity, Globe } from "lucide-react"
import { ResponsiveModal } from "@/components/responsive-modal"
import { ScrollArea } from "@/components/ui/scroll-area"

export function InfoFooter() {
    const [open, setOpen] = useState(false)

    return (
        <div className="mt-12 flex justify-center pb-8">
            <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-2 rounded-full px-6 bg-neutral-100/50 dark:bg-neutral-900/50 backdrop-blur-sm border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-all"
                onClick={() => setOpen(true)}
            >
                <Info className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Security & Architecture</span>
            </Button>

            <ResponsiveModal
                open={open}
                onOpenChange={setOpen}
                title="System Architecture & Security"
                description="How this application protects your data and processes emails"
                className="sm:max-w-2xl"
            >
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-8 py-4">

                        {/* Security Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                                <Shield className="h-5 w-5" />
                                <h3 className="font-semibold text-lg">AES-256 Encryption</h3>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl space-y-3">
                                <p className="text-sm leading-relaxed opacity-90">
                                    This application employs <strong>Client-Side & Server-Side Hybrid Encryption</strong>.
                                    Sensitive data (SMTP passwords, draft tokens) is encrypted using
                                    <strong> AES-256-GCM</strong> (Galois/Counter Mode) authenticated encryption.
                                </p>
                                <ul className="text-xs space-y-2 opacity-80 list-disc pl-4">
                                    <li><strong>Key Derivation:</strong> PBKDF2 with SHA-512 (100k iterations) for robust key generation.</li>
                                    <li><strong>Storage:</strong> Passwords are never stored in plain text. They are hashed with bcrypt or encrypted before database persistence.</li>
                                </ul>
                            </div>
                        </section>

                        {/* Data Flow Grid */}
                        <section className="grid sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-3">
                                <div className="flex items-center gap-2 font-medium">
                                    <Cloud className="h-4 w-4" />
                                    <span>Cloud Sync</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Drafts, history, and settings are synced via a secure API to a PostgreSQL database (via Prisma).
                                    This ensures you can access your work across devices seamlessly.
                                    Sync is authenticated via NextAuth.js JWT sessions.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-3">
                                <div className="flex items-center gap-2 font-medium">
                                    <Server className="h-4 w-4" />
                                    <span>Direct SMTP</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Emails are not routed through third-party marketing servers.
                                    This app connects <strong>directly</strong> to your IONOS SMTP server, ensuring
                                    maximum deliverability and privacy. No "Via" headers.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-3">
                                <div className="flex items-center gap-2 font-medium">
                                    <HardDrive className="h-4 w-4" />
                                    <span>Local-First</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    The app prioritizes local storage (IndexedDB + localStorage) for speed.
                                    If you are offline, you can still edit drafts and view history.
                                    Sync resumes automatically on reconnection.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 space-y-3">
                                <div className="flex items-center gap-2 font-medium">
                                    <Activity className="h-4 w-4" />
                                    <span>Background Jobs</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Scheduled campaigns run via a background cron process.
                                    This allows you to close the tab after scheduling – the server
                                    will handle the delivery at the precise designated time.
                                </p>
                            </div>
                        </section>

                        {/* Privacy Text */}
                        <div className="text-center pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                                <Lock className="h-3 w-3" />
                                Zero Third-Party Tracking
                            </p>
                            <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
                                We do not sell data. We do not use Google Analytics.
                                Only essential Vercel performance metrics are collected anonymously.
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </ResponsiveModal>
        </div>
    )
}
