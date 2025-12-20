"use client"

import { useState } from "react"
import { ShieldCheck, Lock, Server, FileKey, Globe, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { motion } from "framer-motion"

export function SecurityFooter() {
    const [open, setOpen] = useState(false)

    const securitySteps = [
        {
            title: "Local Encryption",
            icon: Lock,
            desc: "Data is encrypted securely on your device (AES-GCM) before it ever touches the network.",
        },
        {
            title: "Secure Transmission",
            icon: Globe,
            desc: "All traffic travels through an encrypted SSL/TLS tunnel, verified by rigorous handshake protocols.",
        },
        {
            title: "Zero-Knowledge Storage",
            icon: Server,
            desc: "We store your encrypted blobs, but we don't hold the keys. Only you can decrypt your data.",
        },
        {
            title: "Signature Verification",
            icon: FileKey,
            desc: "Every decryption request is cryptographically signed to prevent tampering or man-in-the-middle attacks.",
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
                <Drawer open={open} onOpenChange={setOpen}>
                    <DrawerTrigger asChild>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-t-xl rounded-b-none border-t border-x border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black shadow-lg text-xs font-medium px-6 py-1 h-8 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all flex items-center gap-2"
                        >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Security & How it Works
                            <ChevronUp className={`h-3 w-3 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent className="bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 max-h-[85vh]">
                        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 pb-12">
                            <DrawerHeader className="text-center sm:text-left p-0 mb-8">
                                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                                    <div className="p-2 bg-black dark:bg-white rounded-lg">
                                        <ShieldCheck className="h-6 w-6 text-white dark:text-black" />
                                    </div>
                                    <DrawerTitle className="text-2xl font-bold tracking-tight">End-to-End Security Architecture</DrawerTitle>
                                </div>
                                <DrawerDescription className="text-base text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto sm:mx-0">
                                    We employ a military-grade, layered security approach. Your data remains encrypted at rest and in transit, ensuring maximum privacy and integrity.
                                </DrawerDescription>
                            </DrawerHeader>

                            {/* Processing Flow Visualization */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                                {/* Connector Line (Desktop) */}
                                <div className="hidden lg:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-neutral-200 via-neutral-200 to-neutral-200 dark:from-neutral-800 dark:via-neutral-800 dark:to-neutral-800 -z-10" />

                                {securitySteps.map((step, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        viewport={{ once: true }}
                                        className="flex flex-col items-center sm:items-start text-center sm:text-left group"
                                    >
                                        <div className="relative mb-4">
                                            <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                <step.icon className="h-5 w-5 text-black dark:text-white" />
                                            </div>
                                            {/* Number Badge */}
                                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold flex items-center justify-center">
                                                {i + 1}
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 uppercase tracking-wide">
                                            {step.title}
                                        </h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                            {step.desc}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Trust Badge / Footer Info */}
                            <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-neutral-900 text-center">
                                <p className="text-xs text-neutral-400 font-mono tracking-wider uppercase">
                                    Verified & Secured by IONOS Mailer Protocol v2.0
                                </p>
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </div>
    )
}
