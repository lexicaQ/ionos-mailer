"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Lock, Cloud, Key, FileCode, CheckCircle } from "lucide-react"

export function SecurityLoader() {
    const [step, setStep] = useState(0)

    const steps = [
        { text: "Connecting to secure cloud...", icon: Cloud },
        { text: "Authenticating session...", icon: ShieldCheck },
        { text: "Decrypting your data...", icon: Key },
        { text: "Verifying integrity...", icon: FileCode },
        { text: "Access granted", icon: CheckCircle },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev))
        }, 600)

        return () => clearInterval(interval)
    }, [])

    const CurrentIcon = steps[step].icon
    const isComplete = step === steps.length - 1

    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center min-h-[280px]">
            {/* Icon Container */}
            <div className="relative">
                {/* Pulse Ring - Black/White */}
                <motion.div
                    className="absolute inset-0 rounded-2xl bg-neutral-900/5 dark:bg-white/5"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Main Icon Box */}
                <motion.div
                    className="relative z-10 h-20 w-20 bg-neutral-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-xl"
                    animate={isComplete ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <CurrentIcon className={`h-10 w-10 ${isComplete ? 'text-green-400' : 'text-white dark:text-black'}`} />
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Text & Progress */}
            <div className="space-y-3 w-full max-w-[280px]">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={step}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`text-sm font-medium ${isComplete ? 'text-green-600 dark:text-green-400' : 'text-neutral-700 dark:text-neutral-300'}`}
                    >
                        {steps[step].text}
                    </motion.p>
                </AnimatePresence>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${isComplete ? 'bg-green-500' : 'bg-neutral-900 dark:bg-white'}`}
                        initial={{ width: "0%" }}
                        animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                </div>

                {/* Security Badge - Below, minimal */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider"
                >
                    <Lock className="h-3 w-3" />
                    <span>AES-256 Encrypted</span>
                </motion.div>
            </div>
        </div>
    )
}

