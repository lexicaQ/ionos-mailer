"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Shield, Lock, Cloud, Server, Database,
    ExternalLink, Info, Check, ArrowRight, Globe, LockKeyhole
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Drawer } from "vaul"

export function InfoFooter() {
    return (
        <div className="mt-12 border-t border-neutral-200 dark:border-neutral-800">
            <Drawer.Root>
                <Drawer.Trigger asChild>
                    <button className="w-full py-6 flex flex-col items-center justify-center gap-2 group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                        <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 group-hover:scale-110 transition-transform shadow-sm border border-neutral-200 dark:border-neutral-700">
                            <Info className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">How IONOS Mailer Works</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                                Click to view interactive security & infrastructure diagram
                            </p>
                        </div>
                    </button>
                </Drawer.Trigger>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                    <Drawer.Content className="bg-white dark:bg-neutral-950 flex flex-col rounded-t-[20px] h-[92vh] mt-24 fixed bottom-0 left-0 right-0 z-50 shadow-2xl border-t border-neutral-200 dark:border-neutral-800 focus:outline-none">
                        <div className="p-4 bg-white dark:bg-neutral-950 rounded-t-[20px] flex-1 overflow-y-auto">
                            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700 mb-8" />

                            <div className="max-w-4xl mx-auto pb-12">
                                <header className="text-center mb-12 space-y-4">
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tight">System Architecture</h2>
                                    <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                                        Understanding how your data is encrypted, stored, and transmitted through our secure pipeline.
                                    </p>
                                </header>

                                {/* Interactive Timeline / Steps */}
                                <div className="space-y-12 relative before:absolute before:left-4 md:before:left-1/2 before:top-0 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 dark:before:via-neutral-800 before:to-transparent">

                                    {/* Step 1: User Input */}
                                    <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-16">
                                        <div className="flex-1 md:text-right hidden md:block">
                                            <h3 className="text-xl font-bold mb-2">1. You Compose & Send</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                You write your campaigns in the secure dashboard. Authentication is handled via signed JWT sessions (NextAuth.js).
                                            </p>
                                        </div>
                                        <div className="relative z-10 shrink-0">
                                            <div className="h-16 w-16 rounded-2xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-xl ring-4 ring-white dark:ring-neutral-950">
                                                <Shield className="h-8 w-8" />
                                            </div>
                                        </div>
                                        <div className="flex-1 md:hidden">
                                            <h3 className="text-xl font-bold mb-2">1. You Compose & Send</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                You write your campaigns in the secure dashboard. Authentication is handled via signed JWT sessions.
                                            </p>
                                        </div>
                                        <div className="flex-1 p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                <LockKeyhole className="h-4 w-4" /> Client-Side Safety
                                            </h4>
                                            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                                <li className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                    <span>HTTPS/TLS 1.3 encryption in transit</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                    <span>Local Drafts encrypted in IndexedDB</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Step 2: Database Storage */}
                                    <div className="relative flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
                                        <div className="flex-1 hidden md:block">
                                            <h3 className="text-xl font-bold mb-2">2. Secure Storage</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                Data is synchronized to our PostgreSQL database. Sensitive fields are encrypted at rest.
                                            </p>
                                        </div>
                                        <div className="relative z-10 shrink-0">
                                            <div className="h-16 w-16 rounded-2xl bg-neutral-900 dark:bg-neutral-800 flex items-center justify-center text-white shadow-xl ring-4 ring-white dark:ring-neutral-950 border border-neutral-700">
                                                <Database className="h-8 w-8" />
                                            </div>
                                        </div>
                                        <div className="flex-1 md:hidden">
                                            <h3 className="text-xl font-bold mb-2">2. Secure Storage</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                Data is synchronized to our PostgreSQL database. Sensitive fields are encrypted at rest.
                                            </p>
                                        </div>
                                        <div className="flex-1 p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                <Lock className="h-4 w-4" /> Encryption
                                            </h4>
                                            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                                <li className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                    <span><strong>AES-256-GCM</strong> used for SMTP passwords</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                    <span><strong>PBKDF2</strong> key derivation from secret keys</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                    <span>Recipients stored as encrypted blobs</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Step 3: Cron Trigger */}
                                    <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-16">
                                        <div className="flex-1 md:text-right hidden md:block">
                                            <h3 className="text-xl font-bold mb-2">3. The Trigger</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                <span className="font-bold text-neutral-900 dark:text-white">cronjob.org</span> wakes up our server every minute.
                                            </p>
                                        </div>
                                        <div className="relative z-10 shrink-0">
                                            <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl ring-4 ring-white dark:ring-neutral-950">
                                                <Globe className="h-8 w-8" />
                                            </div>
                                        </div>
                                        <div className="flex-1 md:hidden">
                                            <h3 className="text-xl font-bold mb-2">3. The Trigger</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                <span className="font-bold text-neutral-900 dark:text-white">cronjob.org</span> wakes up our server every minute.
                                            </p>
                                        </div>
                                        <div className="flex-1 p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                <Server className="h-4 w-4" /> Background Pipeline
                                            </h4>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-3">
                                                Serverless functions fall asleep to save money. We use <strong>cronjob.org</strong> to hit our specialized API endpoint (<code className="text-xs bg-neutral-200 dark:bg-neutral-800 px-1 rounded">/api/cron/process</code>) every minute.
                                            </p>
                                            <div className="p-3 bg-white dark:bg-black rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-mono text-neutral-500">
                                                POST https://.../api/cron/process<br />
                                                Authorization: Bearer [SECURE_CRON_SECRET]
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step 4: SMTP Delivery */}
                                    <div className="relative flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
                                        <div className="flex-1 hidden md:block">
                                            <h3 className="text-xl font-bold mb-2">4. Direct Delivery</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                Our server decrypts your credentials and connects directly to IONOS.
                                            </p>
                                        </div>
                                        <div className="relative z-10 shrink-0">
                                            <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl ring-4 ring-white dark:ring-neutral-950">
                                                <Cloud className="h-8 w-8" />
                                            </div>
                                        </div>
                                        <div className="flex-1 md:hidden">
                                            <h3 className="text-xl font-bold mb-2">4. Direct Delivery</h3>
                                            <p className="text-neutral-600 dark:text-neutral-400">
                                                Our server decrypts your credentials and connects directly to IONOS.
                                            </p>
                                        </div>
                                        <div className="flex-1 p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                <ArrowRight className="h-4 w-4" /> Final Hop
                                            </h4>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                                We act as a secure proxy. Your emails go:
                                                <br />
                                                <span className="font-semibold text-neutral-900 dark:text-neutral-100">App Server → IONOS SMTP → Recipient</span>
                                            </p>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                                                <strong>Privacy Note:</strong> We treat your SMTP password as a "Transient Secret" - decrypted only for the microseconds needed to establish connection.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center">
                                    <p className="text-sm text-neutral-500 mb-4">
                                        Open Source & Transparent. Inspect the code yourself.
                                    </p>
                                    <Button variant="outline" asChild>
                                        <a href="https://github.com/lexicaQ/ionos-mailer" target="_blank" rel="noopener noreferrer">
                                            View Source Code <ExternalLink className="ml-2 h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}
