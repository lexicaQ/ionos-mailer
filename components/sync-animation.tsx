"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SyncAnimationProps {
    show: boolean
    onComplete?: () => void
}

export function SyncAnimation({ show, onComplete }: SyncAnimationProps) {
    const [stage, setStage] = useState(0)

    useEffect(() => {
        if (!show) return

        const stages = [
            { delay: 0, name: "cache" },
            { delay: 1000, name: "decrypt" },
            { delay: 2000, name: "fetch" },
            { delay: 3500, name: "sync" },
            { delay: 5000, name: "done" }
        ]

        const timers = stages.map(({ delay }, index) =>
            setTimeout(() => setStage(index), delay)
        )

        // Auto-complete after 5 seconds
        const completeTimer = setTimeout(() => {
            onComplete?.()
        }, 5000)

        return () => {
            timers.forEach(clearTimeout)
            clearTimeout(completeTimer)
        }
    }, [show, onComplete])

    const stageInfo = [
        { title: "Loading Cache", desc: "Reading from localStorage" },
        { title: "Decrypting Data", desc: "AES-256-GCM decryption" },
        { title: "Fetching Updates", desc: "Querying Neon database" },
        { title: "Syncing Changes", desc: "Merging fresh data" },
        { title: "Ready", desc: "All campaigns loaded" }
    ]

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-black"
                >
                    <div className="flex flex-col items-center gap-8 px-8">
                        {/* Animated Rings */}
                        <div className="relative w-32 h-32">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="absolute inset-0 border-2 border-black dark:border-white rounded-full"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{
                                        scale: [0.8, 1.2, 0.8],
                                        opacity: [0, 1, 0],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        delay: i * 0.4,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}

                            {/* Center Icon */}
                            <motion.div
                                className="absolute inset-0 flex items-center justify-center"
                                animate={{ rotate: 360 }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                            >
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-black dark:text-white">
                                    <path
                                        d="M12 2L2 7L12 12L22 7L12 2Z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M2 17L12 22L22 17"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M2 12L12 17L22 12"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </motion.div>
                        </div>

                        {/* Stage Information */}
                        <div className="text-center space-y-2 min-h-[80px]">
                            <motion.h3
                                key={`title-${stage}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-2xl font-bold text-black dark:text-white"
                            >
                                {stageInfo[stage]?.title}
                            </motion.h3>
                            <motion.p
                                key={`desc-${stage}`}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-sm text-neutral-600 dark:text-neutral-400 font-mono"
                            >
                                {stageInfo[stage]?.desc}
                            </motion.p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-64 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-black dark:bg-white"
                                initial={{ width: "0%" }}
                                animate={{ width: `${((stage + 1) / 5) * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>

                        {/* Stage Indicators */}
                        <div className="flex gap-2">
                            {stageInfo.map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${i <= stage
                                            ? "bg-black dark:bg-white"
                                            : "bg-neutral-300 dark:bg-neutral-700"
                                        }`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: i <= stage ? 1 : 0.7 }}
                                    transition={{ duration: 0.3 }}
                                />
                            ))}
                        </div>

                        {/* Why This Matters */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: stage >= 2 ? 1 : 0 }}
                            className="mt-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg max-w-md"
                        >
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center leading-relaxed">
                                <span className="font-semibold">Why the wait?</span> We're fetching fresh data from Neon (PostgreSQL)
                                with AES-256 encryption. Your campaigns are stored securely and decrypted on-the-fly
                                for instant display.
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
