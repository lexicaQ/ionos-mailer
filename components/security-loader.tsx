"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Lock, Cloud, Key, FileCode } from "lucide-react"

export function SecurityLoader() {
    const [step, setStep] = useState(0)

    const steps = [
        { text: "Connecting to secure cloud...", icon: Cloud },
        { text: "Verifying identity...", icon: ShieldCheck },
        { text: "Decrypting data...", icon: Key },
        { text: "Validating signatures...", icon: FileCode },
        { text: "Loading content...", icon: Lock },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % steps.length)
        }, 700)

        return () => clearInterval(interval)
    }, [])

    const CurrentIcon = steps[step].icon

    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center h-64">
            <div className="relative">
                {/* Pulse Ring - Neutral */}
                <motion.div
                    className="absolute inset-0 rounded-full bg-neutral-500/10 dark:bg-neutral-400/5 blur-xl"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Icon Container */}
                <div className="relative z-10 h-16 w-16 bg-white dark:bg-black rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shadow-xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <CurrentIcon className="h-7 w-7 text-neutral-900 dark:text-neutral-100" />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Lock indicator - Small, subtle */}
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-black dark:bg-white rounded-full flex items-center justify-center border-2 border-white dark:border-black">
                    <Lock className="h-2.5 w-2.5 text-white dark:text-black" />
                </div>
            </div>

            <div className="space-y-3 max-w-[220px]">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={step}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                    >
                        {steps[step].text}
                    </motion.p>
                </AnimatePresence>

                {/* Progress dots */}
                <div className="flex justify-center gap-1.5">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${i === step
                                    ? "bg-black dark:bg-white w-4"
                                    : "bg-neutral-300 dark:bg-neutral-700"
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

