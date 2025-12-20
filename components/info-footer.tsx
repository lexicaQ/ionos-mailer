"use client"

import { useState } from "react"
import {
    Shield, Lock, Server, HardDrive,
    ChevronDown, ChevronUp, ExternalLink, Info,
    Database, Key, Globe, LayoutGrid, Cpu, Mail, Cloud
} from "lucide-react"
import { cn } from "@/lib/utils"

export function InfoFooter() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="mt-16 border-t border-neutral-200 dark:border-neutral-800">
            {/* Toggle Bar */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 flex flex-col items-center justify-center gap-2 group hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200">
                    <Info className="h-4 w-4" />
                    <span>How IONOS dMailer Works & Security Architecture</span>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>

            {/* Expanded Content */}
            {isOpen && (
                <div className="bg-neutral-50/50 dark:bg-neutral-900/20 pb-16 pt-8 px-4 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="max-w-6xl mx-auto space-y-12">

                        {/* 1. Architecture Grid */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Security Column */}
                            <div className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Military-Grade Encryption</h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                                    Your sensitive data never sits idle in plain text. We use <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">AES-256-GCM</span> encryption server-side.
                                </p>
                                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                    <li className="flex gap-2 items-start">
                                        <Key className="h-4 w-4 mt-0.5 text-neutral-400" />
                                        <span>User passwords hashed via <strong className="text-neutral-700 dark:text-neutral-300">bcrypt</strong></span>
                                    </li>
                                    <li className="flex gap-2 items-start">
                                        <Lock className="h-4 w-4 mt-0.5 text-neutral-400" />
                                        <span>SMTP creds & drafts encrypted at rest</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Delivery Column */}
                            <div className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                                    <Server className="h-5 w-5" />
                                </div>
                                <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Smart Background Delivery</h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                                    Emails are processed asynchronously using a robust queuing system (Postgres + Cron).
                                </p>
                                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                    <li className="flex gap-2 items-start">
                                        <Cpu className="h-4 w-4 mt-0.5 text-neutral-400" />
                                        <span>Non-blocking "Fire & Forget" sending</span>
                                    </li>
                                    <li className="flex gap-2 items-start">
                                        <Globe className="h-4 w-4 mt-0.5 text-neutral-400" />
                                        <span>Rate-limit protection via spacing</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Data Column */}
                            <div className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                                    <Database className="h-5 w-5" />
                                </div>
                                <h3 className="font-bold text-neutral-900 dark:text-white mb-2">Hybrid Storage Engine</h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                                    We split data storage for optimal speed and privacy compliance.
                                </p>
                                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                    <li className="flex gap-2 items-start">
                                        <LayoutGrid className="h-4 w-4 mt-0.5 text-neutral-400" />
                                        <span><strong>Local:</strong> Settings cache (localStorage)</span>
                                    </li>
                                    <li className="flex gap-2 items-start">
                                        <Cloud className="h-4 w-4 mt-0.5 text-neutral-400" />
                                        <span><strong>Cloud:</strong> Synced drafts & campaigns (DB)</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* 2. Visual Data Journey */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-neutral-50 dark:bg-neutral-900 px-4 text-sm text-neutral-500 uppercase tracking-widest font-bold">Data Journey</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                            {[
                                { step: "1", title: "Input", desc: "You enter data. Client-side validation runs immediately.", icon: LayoutGrid },
                                { step: "2", title: "Encryption", desc: "Sensitive fields are encrypted before touching the database.", icon: Lock },
                                { step: "3", title: "Storage", desc: "Encrypted blobs stored in Postgres. Keys managed via PBKDF2.", icon: Database },
                                { step: "4", title: "Transmission", desc: "Data decrypted ONLY for SMTP transmission over TLS 1.3.", icon: Mail },
                            ].map((s, i) => (
                                <div key={i} className="flex flex-col items-center text-center p-4">
                                    <div className="h-8 w-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold mb-3 shadow-lg z-10">
                                        {s.step}
                                    </div>
                                    <h4 className="font-bold text-neutral-900 dark:text-white mb-1">{s.title}</h4>
                                    <p className="text-xs text-neutral-500 max-w-[200px]">{s.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Footer Note */}
                        <div className="text-center pt-8 border-t border-neutral-200 dark:border-neutral-800">
                            <p className="text-xs text-neutral-400">
                                Built with Next.js 16 • Server Actions • Prisma • Tailwind CSS •
                                <a
                                    href="https://github.com/lexicaQ/ionos-mailer"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 ml-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                                >
                                    View Source Code <ExternalLink className="h-3 w-3" />
                                </a>
                            </p>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
