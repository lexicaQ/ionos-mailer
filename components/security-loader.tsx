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
        // Slower animation, stop at last step
        const interval = setInterval(() => {
            setStep((prev) => {
                const next = prev + 1;
                if (next >= steps.length) {
                    clearInterval(interval);
                    return prev;
                }
                return next;
            })
        }, 1200) // Slower speed (1.2s per step)

        return () => clearInterval(interval)
    }, [])

    const CurrentIcon = steps[step].icon

    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center h-64">
            <div className="relative">
                {/* Pulse Ring - Neutral */}
                <motion.div
                    className="absolute inset-0 rounded-full bg-neutral-500/10 dark:bg-neutral-400/5 blur-xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />

                {/* Icon Container - Removed bg-white/black, made transparent/subtle */}
                <div className="relative z-10 h-16 w-16 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <CurrentIcon className="h-10 w-10 text-neutral-800 dark:text-neutral-200" />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Lock indicator - Hidden for cleaner look or kept subtle? User asked to remove white bg behind icon. 
                   The lock indicator also had a bg. Let's remove it to be super clean as requested.
                */}
            </div>

            <div className="space-y-3 max-w-[220px]">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={step}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.4 }}
                        className="text-sm font-medium text-neutral-600 dark:text-neutral-400"
                    >
                        {steps[step].text}
                    </motion.p>
                </AnimatePresence>

                {/* Progress bars instead of dots for "loading" feel */}
                <div className="h-1 w-32 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto overflow-hidden">
                    <motion.div
                        className="h-full bg-neutral-800 dark:bg-neutral-200"
                        initial={{ width: "0%" }}
                        animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 1.2, ease: "linear" }}
                    />
                </div>
            </div>
        </div>
    )
}


