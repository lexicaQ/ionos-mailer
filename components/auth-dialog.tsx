"use client"

import { useState, useEffect, useCallback } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/responsive-modal"
import { toast } from "sonner"
import { LogOut, Loader2, Cloud, Mail } from "lucide-react"

const SESSION_HINT_KEY = "ionos-mailer-logged-in"

interface AuthDialogProps {
    customTrigger?: React.ReactNode
}

export function AuthDialog({ customTrigger }: AuthDialogProps) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    // LOCAL HINT: Read synchronously for instant UI feedback (avoids flash)
    const [localHint, setLocalHint] = useState<boolean | null>(() => {
        if (typeof window !== 'undefined') {
            const hint = localStorage.getItem(SESSION_HINT_KEY)
            return hint === "true"
        }
        return null
    })

    // Sync localStorage when session changes (session is source of truth)
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            localStorage.setItem(SESSION_HINT_KEY, "true")
            setLocalHint(true)
        } else if (status === "unauthenticated") {
            localStorage.removeItem(SESSION_HINT_KEY)
            setLocalHint(false)
        }
    }, [status, session])

    // BACKEND WARMUP: Wake up serverless functions for Passkeys when modal opens
    // Also called on button hover for even faster response
    const warmupEndpoints = useCallback(() => {
        // Non-blocking pings to wake up the JIT compiler/serverless containers
        fetch("/api/passkeys/auth-options").catch(() => { });
        fetch("/api/passkeys/auth-verify", { method: 'HEAD' }).catch(() => { });
    }, []);

    useEffect(() => {
        if (open) {
            console.log("[Auth] Warming up passkey endpoints...");
            warmupEndpoints();
        }
    }, [open, warmupEndpoints]);

    // Form state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [passkeyOptions, setPasskeyOptions] = useState<any>(null)

    // PRE-FETCH PASSKEY OPTIONS: Zero-Latency Logic
    // Fetch options as soon as modal opens or email changes (debounced)
    useEffect(() => {
        if (!open) return;

        const fetchOptions = async () => {
            try {
                // Import dynamically to avoid bundle bloating
                const { fetchAuthOptions } = await import("@/lib/passkeys");
                // Fetch options for "Usernameless" flow (empty email) OR specific user
                const options = await fetchAuthOptions(email || undefined);
                setPasskeyOptions(options);
            } catch (e) {
                console.warn("[Auth] Background pre-fetch failed:", e);
                // Fail silently - click handler will retry and show error
            }
        };

        // Debounce: Wait 300ms after typing stops (reduced from 500ms)
        const timer = setTimeout(fetchOptions, 300);
        return () => clearTimeout(timer);
    }, [open, email]);

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
                // Save hint IMMEDIATELY for instant UI on next load
                localStorage.setItem(SESSION_HINT_KEY, "true")

                // UX IMPROVEMENT: Auto-fill SMTP settings from these credentials
                // The SettingsDialog will pick this up when the session changes
                const smtpConfig = {
                    host: "smtp.ionos.de",
                    port: 587,
                    user: email.toLowerCase().trim(),
                    pass: password, // Save the password locally so it can be used for SMTP
                    secure: false,
                    delay: 1000,
                    fromName: "",
                    savePassword: true
                };
                localStorage.setItem("smtp-config-full", JSON.stringify(smtpConfig));

                setLocalHint(true)
                toast.success("Connected! SMTP settings automatically configured.")
                setOpen(false)
                // Fast refresh using Next.js router (no full page reload)
                router.refresh()
            }
        } catch (error) {
            toast.error("Connection failed")
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        // INSTANT LOGOUT: Clear localStorage hint immediately (optimistic)
        localStorage.removeItem(SESSION_HINT_KEY)
        // Clear caches to prevent "Flash of Old Data" on next login
        localStorage.removeItem("ionos-mailer-campaigns-cache");
        localStorage.removeItem("ionos-mailer-campaign-completion");
        localStorage.removeItem("ionos-mailer-user-id");
        localStorage.removeItem("ionos-mailer-cache-owner");
        localStorage.removeItem("ionos-mailer-tracking-status");

        setLocalHint(false)

        // Show logout toast immediately
        toast.success("Logged out successfully", {
            duration: 2000,
            className: "animate-out fade-out duration-300"
        })

        // Sign out in background (don't wait)
        signOut({ redirect: false }).catch(() => {
            // If sign out fails, just log it - user already sees logged out UI
            console.error('Background sign out failed')
        })
    }

    // INSTANT UI: Use localStorage hint OR actual session
    // Priority: session (source of truth) > localStorage hint
    const shouldShowLogout = session?.user || localHint === true;

    // Logged in state - Minimalist (Just Logout Icon) with fade animation
    if (mounted && shouldShowLogout) {
        return (
            <div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleLogout}
                    title="Disconnect"
                    className="transition-opacity duration-300 hover:opacity-70"
                >
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    // Still loading hydration? Render null to avoid flicker
    if (!mounted) return <div className="w-[36px] h-[36px]" /> // Maintain size of the button

    // Logged out state
    return (
        <div suppressHydrationWarning>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                onMouseEnter={warmupEndpoints}
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
                forceDialog={true}
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

                {/* Passkey Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-neutral-950 px-2 text-muted-foreground">
                            Or continue with
                        </span>
                    </div>
                </div>

                <div className="pb-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const { startPasskeyAuthentication, fetchAuthOptions } = await import("@/lib/passkeys");

                                // 1. Use cached options OR fetch new ones (fallback)
                                let currentOptions = passkeyOptions;
                                if (!currentOptions) {
                                    console.log("[Auth] No cached options, fetching now...");
                                    currentOptions = await fetchAuthOptions(email || undefined);
                                } else {
                                    console.log("[Auth] Using cached options for zero-latency!");
                                }

                                // 2. Start Auth immediately (Browser Prompt)
                                const { credential, challengeId } = await startPasskeyAuthentication(currentOptions);

                                // Verify with backend first to get auth token
                                const verifyRes = await fetch("/api/passkeys/auth-verify", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ...credential, challengeId })
                                });

                                if (!verifyRes.ok) {
                                    const error = await verifyRes.json();
                                    // Clear any stale hints
                                    localStorage.removeItem(SESSION_HINT_KEY);
                                    setLocalHint(false);
                                    throw new Error(error.error || "Verification failed");
                                }

                                const { authToken } = await verifyRes.json();

                                // Use auth token for fast NextAuth login (no re-verification!)
                                const result = await signIn("webauthn", {
                                    authToken,
                                    redirect: false
                                });

                                if (result?.error) {
                                    // Clear hints on error
                                    localStorage.removeItem(SESSION_HINT_KEY);
                                    setLocalHint(false);
                                    toast.error("Passkey login failed");
                                    console.error(result.error);
                                } else {
                                    localStorage.setItem(SESSION_HINT_KEY, "true");
                                    setLocalHint(true);
                                    toast.success("Logged in with Passkey!");
                                    setOpen(false);
                                    // Fast refresh using Next.js router (no full page reload)
                                    router.refresh();
                                }
                            } catch (e: any) {
                                // Clear hints on any error
                                localStorage.removeItem(SESSION_HINT_KEY);
                                setLocalHint(false);

                                if (e.message?.includes("cancelled") || e.message?.includes("canceled")) {
                                    // User cancelled - ignore
                                } else {
                                    toast.error(e.message || "Passkey error");
                                }
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        <svg className="h-4 w-4 text-black dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Passkey
                    </Button>
                </div>
            </ResponsiveModal>
        </div>
    )
}
