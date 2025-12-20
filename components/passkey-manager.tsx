"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    registerPasskey,
    listPasskeys,
    deletePasskey,
    renamePasskey,
    browserSupportsWebAuthn,
    type PasskeyInfo
} from "@/lib/passkeys"
import { toast } from "sonner"
import { Fingerprint, Plus, Trash2, Pencil, Check, X, Loader2, Smartphone, Cloud, Monitor } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function PasskeyManager() {
    const { data: session } = useSession()
    const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
    const [loading, setLoading] = useState(false)
    const [registering, setRegistering] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [supported, setSupported] = useState(true)

    useEffect(() => {
        setSupported(browserSupportsWebAuthn())
    }, [])

    useEffect(() => {
        if (session?.user) {
            loadPasskeys()
        }
    }, [session])

    const loadPasskeys = async () => {
        setLoading(true)
        try {
            const list = await listPasskeys()
            setPasskeys(list)
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        setRegistering(true)
        try {
            await registerPasskey()
            toast.success("Passkey created successfully!")
            await loadPasskeys()
        } catch (error: any) {
            toast.error(error.message || "Failed to create passkey")
        } finally {
            setRegistering(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this passkey? You won't be able to sign in with it anymore.")) {
            return
        }

        const success = await deletePasskey(id)
        if (success) {
            toast.success("Passkey removed")
            setPasskeys(prev => prev.filter(p => p.id !== id))
        } else {
            toast.error("Failed to remove passkey")
        }
    }

    const handleRename = async (id: string) => {
        if (!editName.trim()) {
            setEditingId(null)
            return
        }

        const success = await renamePasskey(id, editName.trim())
        if (success) {
            setPasskeys(prev => prev.map(p =>
                p.id === id ? { ...p, name: editName.trim() } : p
            ))
            toast.success("Passkey renamed")
        }
        setEditingId(null)
    }

    const startEdit = (passkey: PasskeyInfo) => {
        setEditingId(passkey.id)
        setEditName(passkey.name || "")
    }

    const getDeviceIcon = (deviceType: string, backedUp: boolean) => {
        if (backedUp) return <Cloud className="h-4 w-4 text-black dark:text-white" />
        if (deviceType === "multiDevice") return <Smartphone className="h-4 w-4" />
        return <Monitor className="h-4 w-4" />
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "Never"
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        })
    }

    if (!session?.user) return null
    if (!supported) {
        return (
            <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
                <p className="text-sm text-muted-foreground">
                    Passkeys are not supported in this browser.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Fingerprint className="h-4 w-4" />
                        Passkeys
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                        Sign in without a password using Face ID, Touch ID, or Windows Hello
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegister}
                    disabled={registering}
                >
                    {registering ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Passkey
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : passkeys.length === 0 ? (
                <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                        No passkeys registered yet. Add one to enable passwordless sign-in.
                    </p>
                </div>
            ) : (
                <AnimatePresence mode="popLayout">
                    {passkeys.map(passkey => (
                        <motion.div
                            key={passkey.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border"
                        >
                            <div className="flex items-center gap-3">
                                {getDeviceIcon(passkey.deviceType, passkey.backedUp)}

                                {editingId === passkey.id ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="h-7 w-40 text-sm"
                                            placeholder="Passkey name"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === "Enter") handleRename(passkey.id)
                                                if (e.key === "Escape") setEditingId(null)
                                            }}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => handleRename(passkey.id)}
                                        >
                                            <Check className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => setEditingId(null)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm font-medium">
                                            {passkey.name || "Unnamed Passkey"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {passkey.backedUp ? "Synced" : passkey.deviceType === "singleDevice" ? "This device only" : "Multiple devices"}
                                            {passkey.lastUsedAt && ` · Last used ${formatDate(passkey.lastUsedAt)}`}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {editingId !== passkey.id && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => startEdit(passkey)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                        onClick={() => handleDelete(passkey.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>
    )
}
