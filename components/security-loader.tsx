"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Lock, Cloud, Key, FileCode } from "lucide-react"

export function SecurityLoader() {
    const [step, setStep] = useState(0)

    const steps = [
        { text: "Connecting to secure cloud storage...", icon: Cloud },
        { text: "Verifying user identity...", icon: ShieldCheck },
        { text: "Decrypting sensitive data...", icon: Key },
        { text: "Analyzing encryption signatures...", icon: FileCode },
        { text: "Access granted. Loading data.", icon: Lock },
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev))
        }, 800)

        return () => clearInterval(interval)
    }, [])

    const CurrentIcon = steps[step].icon

    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6 text-center h-64">
            <div className="relative">
                {/* Pulse Ring */}
                <motion.div
                    className="absolute inset-0 rounded-full bg-blue-500/20 dark:bg-blue-400/10 blur-xl"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Icon Transition */}
                <div className="relative z-10 h-16 w-16 bg-white dark:bg-black rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shadow-2xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <CurrentIcon className="h-8 w-8 text-neutral-900 dark:text-neutral-100" />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Secure Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-white dark:border-black"
                >
                    <Lock className="h-2 w-2" /> E2EE
                </motion.div>
            </div>

            <div className="space-y-2 max-w-[250px]">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={step}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm font-medium text-neutral-900 dark:text-neutral-100 font-mono"
                    >
                        {steps[step].text}
                    </motion.p>
                </AnimatePresence>

                {/* Loading Bar */}
                <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-neutral-900 dark:bg-neutral-100"
                        initial={{ width: "0%" }}
                        animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>
        </div>
    )
}
