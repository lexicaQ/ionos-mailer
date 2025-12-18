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

export function AuthDialog() {
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
        // No email required for discoverable credentials (usernameless)

        setPasskeyLoading(true)
        try {
            // 1. Get options - if email is known, standard flow; if not, discoverable
            const url = email
                ? `/api/auth/passkey/login?email=${encodeURIComponent(email)}`
                : `/api/auth/passkey/login`

            const optionsRes = await fetch(url)
            if (!optionsRes.ok) {
                const err = await optionsRes.json()
                throw new Error(err.error || "Passkey login failed")
            }
            const { options, userId } = await optionsRes.json()

            // 2. Authenticate with browser
            const credential = await startAuthentication(options)

            // 3. Verify on server
            const verifyRes = await fetch("/api/auth/passkey/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ response: credential, userId }), // userId might be undefined here for usernameless, that's fine
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Verification failed")
            }

            // 4. Secure Handoff: Login with temporary token
            const result = await signIn("credentials", {
                email: verifyData.email,
                loginToken: verifyData.loginToken,
                redirect: false,
            })

            if (result?.error) {
                throw new Error("Login handoff failed")
            }

            toast.success("Logged in with Passkey!")
            setOpen(false)
            setEmail("")
            setPassword("")

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Passkey login failed")
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
                description="Use your IONOS email credentials to sync drafts and settings across all your devices"
                className="sm:max-w-[400px]"
            >
                <form onSubmit={handleConnect} className="space-y-4 py-4">
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
                        <Button type="submit" className="w-full" disabled={loading || passkeyLoading}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Cloud className="h-4 w-4 mr-2" />
                            )}
                            Connect & Sync
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={handlePasskeyLogin}
                            disabled={loading || passkeyLoading}
                        >
                            {passkeyLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Fingerprint className="h-4 w-4 mr-2" />
                            )}
                            Sign in with Passkey
                        </Button>
                    </div>

                    <p className="text-center text-[11px] text-muted-foreground">
                        Same credentials = same account on all devices
                    </p>
                </form>
            </ResponsiveModal>
        </>
    )
}
