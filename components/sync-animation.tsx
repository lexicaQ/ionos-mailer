"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw } from "lucide-react"

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
                    className="absolute inset-0 z-[50] flex items-center justify-center bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm rounded-lg"
                >
                    <div className="flex flex-col items-center gap-6 px-8">
                        {/* Animated Rings - Smaller */}
                        <div className="relative w-24 h-24">
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
                                <RefreshCw className="h-8 w-8 text-black dark:text-white" />
                            </motion.div>
                        </div>

                        {/* Simplified Status */}
                        <div className="text-center space-y-3 min-w-[200px]">
                            <motion.h3
                                key={`title-${stage}`}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-lg font-bold text-black dark:text-white"
                            >
                                Syncing...
                            </motion.h3>

                            {/* Progress Bar */}
                            <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-black dark:bg-white"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${((stage + 1) / 5) * 100}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>

                            <p className="text-xs text-muted-foreground font-mono">
                                {stageInfo[stage]?.desc}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
