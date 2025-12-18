"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { startRegistration } from "@simplewebauthn/browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { KeyRound, Plus, Trash2, Loader2, Smartphone, Fingerprint } from "lucide-react"
import { format } from "date-fns"

interface Passkey {
    id: string
    deviceName: string | null
    createdAt: string
}

export function PasskeyManager() {
    const { data: session } = useSession()
    const [passkeys, setPasskeys] = useState<Passkey[]>([])
    const [loading, setLoading] = useState(true)
    const [registering, setRegistering] = useState(false)

    // Fetch existing passkeys
    useEffect(() => {
        if (session?.user) {
            fetchPasskeys()
        }
    }, [session])

    const fetchPasskeys = async () => {
        try {
            const res = await fetch("/api/auth/passkey/list")
            if (res.ok) {
                const data = await res.json()
                setPasskeys(data.passkeys || [])
            }
        } catch (error) {
            console.error("Error fetching passkeys:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleRegisterPasskey = async () => {
        if (!session?.user) {
            toast.error("Please sign in first")
            return
        }

        setRegistering(true)
        try {
            // Step 1: Get registration options from server
            const optionsRes = await fetch("/api/auth/passkey/register")
            if (!optionsRes.ok) {
                throw new Error("Failed to get registration options")
            }
            const { options } = await optionsRes.json()

            // Step 2: Start WebAuthn registration (browser prompts for biometric)
            const credential = await startRegistration(options)

            // Step 3: Send credential to server for verification
            const verifyRes = await fetch("/api/auth/passkey/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    response: credential,
                    // No manual device name, server will detect or default
                }),
            })

            if (!verifyRes.ok) {
                const error = await verifyRes.json()
                throw new Error(error.error || "Verification failed")
            }

            toast.success("Passkey registered successfully!")
            await fetchPasskeys() // Refresh list immediately
        } catch (error: any) {
            console.error("Passkey registration error:", error)
            if (error.name === "NotAllowedError") {
                toast.error("Passkey registration was cancelled")
            } else {
                toast.error(error.message || "Failed to register passkey")
            }
        } finally {
            setRegistering(false)
        }
    }

    const handleDeletePasskey = async (passkeyId: string) => {
        if (!confirm("Remove this passkey? You won't be able to use it to sign in anymore.")) {
            return
        }

        try {
            const res = await fetch("/api/auth/passkey/register", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passkeyId }),
            })

            if (!res.ok) {
                throw new Error("Failed to delete passkey")
            }

            toast.success("Passkey removed")
            fetchPasskeys()
        } catch (error) {
            toast.error("Failed to remove passkey")
        }
    }

    if (!session?.user) {
        return (
            <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-center">
                <KeyRound className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
                <p className="text-sm text-muted-foreground">
                    Connect your account to manage passkeys
                </p>
                <div className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Fingerprint className="h-3 w-3" />
                    <span>Auto-sync enabled</span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    <h3 className="font-medium">Passkeys</h3>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegisterPasskey}
                    disabled={registering}
                >
                    {registering ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Add Passkey
                </Button>
            </div>

            <p className="text-xs text-muted-foreground">
                Sign in with Face ID, Touch ID, or Windows Hello.
            </p>

            {/* Existing passkeys list */}
            {loading ? (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : passkeys.length > 0 ? (
                <div className="space-y-2">
                    {passkeys.map((passkey) => (
                        <div
                            key={passkey.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center border shadow-sm">
                                    <Smartphone className="h-4 w-4 text-neutral-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">
                                        {passkey.deviceName || "Unspecified Device"}
                                    </p>
                                    <div className="text-xs text-muted-foreground flex gap-2">
                                        <span>{format(new Date(passkey.createdAt), "MMM d, yyyy")}</span>
                                        <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                        <span>{format(new Date(passkey.createdAt), "HH:mm")}</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePasskey(passkey.id)}
                                title="Remove"
                            >
                                <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500 transition-colors" />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg bg-neutral-50/50 dark:bg-neutral-900/20">
                    No passkeys found. Add one for easier login.
                </div>
            )}
        </div>
    )
}
