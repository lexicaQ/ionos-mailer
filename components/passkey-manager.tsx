"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { startRegistration } from "@simplewebauthn/browser"
import { Fingerprint, Loader2, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"

interface Passkey {
    id: string
    deviceName: string | null
    createdAt: string
    lastUsedAt: string | null
}

export function PasskeyManager() {
    const [passkeys, setPasskeys] = useState<Passkey[]>([])
    const [loading, setLoading] = useState(true)
    const [registering, setRegistering] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    const fetchPasskeys = async () => {
        try {
            const res = await fetch('/api/auth/passkey/list')
            if (res.ok) {
                const data = await res.json()
                setPasskeys(data.passkeys || [])
            }
        } catch (error) {
            console.error('Failed to fetch passkeys:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPasskeys()
    }, [])

    const handleRegister = async () => {
        setRegistering(true)
        try {
            // Get registration options
            const optionsRes = await fetch('/api/auth/passkey/register/options', {
                method: 'POST'
            })
            if (!optionsRes.ok) {
                throw new Error('Failed to get registration options')
            }
            const options = await optionsRes.json()

            // Prompt browser to create credential
            const credential = await startRegistration(options)

            // Verify with server
            const verifyRes = await fetch('/api/auth/passkey/register/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response: credential,
                    deviceName: getDeviceName()
                })
            })

            if (!verifyRes.ok) {
                const error = await verifyRes.json()
                throw new Error(error.error || 'Registration failed')
            }

            toast.success("Passkey registered successfully!")
            fetchPasskeys()
        } catch (error: any) {
            console.error('Passkey registration error:', error)
            if (error.name === 'NotAllowedError') {
                toast.error("Passkey registration was cancelled")
            } else if (error.name === 'NotSupportedError') {
                toast.error("Passkeys are not supported on this device")
            } else {
                toast.error(error.message || "Failed to register passkey")
            }
        } finally {
            setRegistering(false)
        }
    }

    const handleDelete = async (id: string) => {
        setDeleting(id)
        try {
            const res = await fetch('/api/auth/passkey/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })

            if (res.ok) {
                toast.success("Passkey removed")
                setPasskeys(prev => prev.filter(pk => pk.id !== id))
            } else {
                throw new Error('Failed to delete passkey')
            }
        } catch (error) {
            toast.error("Failed to remove passkey")
        } finally {
            setDeleting(null)
        }
    }

    const getDeviceName = () => {
        const ua = navigator.userAgent
        if (ua.includes('Mac')) return 'Mac (Touch ID)'
        if (ua.includes('iPhone')) return 'iPhone (Face ID)'
        if (ua.includes('iPad')) return 'iPad (Touch ID)'
        if (ua.includes('Windows')) return 'Windows (Hello)'
        if (ua.includes('Android')) return 'Android'
        return 'Unknown Device'
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {passkeys.length > 0 ? (
                <div className="space-y-2">
                    {passkeys.map(pk => (
                        <div
                            key={pk.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-neutral-50 dark:bg-neutral-900/50"
                        >
                            <div className="flex items-center gap-3">
                                <Fingerprint className="h-5 w-5 text-neutral-500" />
                                <div>
                                    <p className="text-sm font-medium">{pk.deviceName || 'Passkey'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Added {formatDate(pk.createdAt)}
                                        {pk.lastUsedAt && ` • Used ${formatDate(pk.lastUsedAt)}`}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(pk.id)}
                                disabled={deleting === pk.id}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                                {deleting === pk.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-center text-muted-foreground py-2">
                    No passkeys registered yet
                </p>
            )}

            <Button
                variant="outline"
                size="sm"
                className="w-full"
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
    )
}
