"use client"

import { motion } from "framer-motion"

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
            >
                {/* Animated logo placeholder */}
                <motion.div
                    className="h-12 w-12 rounded-2xl bg-neutral-900 dark:bg-white"
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Loading bar */}
                <div className="w-48 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-neutral-900 dark:bg-white"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </div>

                <p className="text-sm text-muted-foreground">Loading...</p>
            </motion.div>
        </div>
    )
}
