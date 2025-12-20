"use client"

import { useState } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/responsive-modal"
import { startAuthentication } from "@simplewebauthn/browser"

import { toast } from "sonner"
import { LogOut, Loader2, Cloud, Mail, Fingerprint } from "lucide-react"

interface AuthDialogProps {
    customTrigger?: React.ReactNode
}

export function AuthDialog({ customTrigger }: AuthDialogProps) {
    const { data: session, status } = useSession()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [passkeyLoading, setPasskeyLoading] = useState(false)

    // Form state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await signIn("credentials", {
                email: email.toLowerCase().trim(),
                password,
                redirect: false,
            })

            if (result?.error) {
                toast.error("Invalid credentials. Please check your IONOS email and password.")
            } else {
                toast.success("Connected! Your data is now synced across devices.")
                setOpen(false)
                setEmail("")
                setPassword("")
            }
        } catch (error) {
            toast.error("Connection failed")
        } finally {
            setLoading(false)
        }
    }

    const handlePasskeyLogin = async () => {
        setPasskeyLoading(true)
        try {
            // Get authentication options from server
            const optionsRes = await fetch('/api/auth/passkey/login/options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // Empty body for discoverable credentials
            })

            if (!optionsRes.ok) {
                throw new Error('Failed to get authentication options')
            }

            const options = await optionsRes.json()

            // Trigger browser passkey prompt
            const credential = await startAuthentication(options)

            // Verify with server
            const verifyRes = await fetch('/api/auth/passkey/login/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: credential })
            })

            if (!verifyRes.ok) {
                const error = await verifyRes.json()
                throw new Error(error.error || 'Authentication failed')
            }

            toast.success("Signed in with passkey!")
            setOpen(false)

            // Refresh the page to update session state
            window.location.reload()
        } catch (error: any) {
            console.error('Passkey login error:', error)
            if (error.name === 'NotAllowedError') {
                toast.error("Passkey authentication was cancelled")
            } else if (error.name === 'NotSupportedError') {
                toast.error("Passkeys are not supported on this device")
            } else {
                toast.error(error.message || "Passkey authentication failed")
            }
        } finally {
            setPasskeyLoading(false)
        }
    }

    const handleLogout = async () => {
        await signOut({ redirect: false })
        toast.success("Disconnected from cloud sync")
    }

    // Loading state
    if (status === "loading") {
        return (
            <Button variant="ghost" size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
        )
    }

    // Logged in state - Minimalist (Just Logout Icon, matches Settings)
    if (session?.user) {
        return (
            <Button variant="outline" size="icon" onClick={handleLogout} title="Disconnect">
                <LogOut className="h-4 w-4" />
            </Button>
        )
    }

    // Logged out state
    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="gap-2 bg-white dark:bg-neutral-950"
            >
                <Cloud className="h-4 w-4" />
                <span>Sign In</span>
            </Button>

            <ResponsiveModal
                open={open}
                onOpenChange={setOpen}
                title="Sync Your Data"
                description="Sign in to sync drafts and settings across all your devices"
                className="sm:max-w-[400px]"
                forceDialog={true}
            >
                <div className="space-y-4 py-4">
                    {/* Passkey Login Button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 gap-3 text-base font-medium border-2 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        onClick={handlePasskeyLogin}
                        disabled={passkeyLoading}
                    >
                        {passkeyLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Fingerprint className="h-5 w-5" />
                        )}
                        Sign in with Passkey
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-neutral-950 px-2 text-muted-foreground">
                                or use password
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleConnect} className="space-y-4">
                        <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                            <p className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Use your IONOS SMTP credentials
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="auth-email" className="text-xs">IONOS Email</Label>
                            <Input
                                id="auth-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@your-domain.com"
                                required
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <Label htmlFor="auth-password" className="text-xs">IONOS Password</Label>
                            <Input
                                id="auth-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>

                        <div className="space-y-3">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Cloud className="h-4 w-4 mr-2" />
                                )}
                                Connect & Sync
                            </Button>
                        </div>

                        <p className="text-center text-[11px] text-muted-foreground">
                            Same credentials = same account on all devices
                        </p>
                    </form>
                </div>
            </ResponsiveModal>
        </>
    )
}
