"use client"

import { useState } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/responsive-modal"
import { toast } from "sonner"
import { User, LogOut, LogIn, UserPlus, Loader2, KeyRound } from "lucide-react"

export function AuthDialog() {
    const { data: session, status } = useSession()
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<"login" | "register">("login")
    const [loading, setLoading] = useState(false)

    // Form state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                toast.error("Invalid email or password")
            } else {
                toast.success("Logged in successfully!")
                setOpen(false)
                resetForm()
            }
        } catch (error) {
            toast.error("Login failed")
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Registration failed")
            }

            toast.success("Account created! Logging in...")

            // Auto-login after registration
            await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            setOpen(false)
            resetForm()
        } catch (error: any) {
            toast.error(error.message || "Registration failed")
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await signOut({ redirect: false })
        toast.success("Logged out")
    }

    const resetForm = () => {
        setEmail("")
        setPassword("")
        setName("")
    }

    // Loading state
    if (status === "loading") {
        return (
            <Button variant="ghost" size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
        )
    }

    // Logged in state
    if (session?.user) {
        return (
            <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{session.user.name || session.user.email?.split("@")[0]}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} title="Sign out">
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    // Logged out state
    return (
        <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
            </Button>

            <ResponsiveModal
                open={open}
                onOpenChange={setOpen}
                title={mode === "login" ? "Sign In" : "Create Account"}
                description={
                    mode === "login"
                        ? "Access your drafts and settings across devices"
                        : "Create an account to sync your data"
                }
                className="sm:max-w-[400px]"
            >
                <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4 py-4">
                    {mode === "register" && (
                        <div>
                            <Label htmlFor="name" className="text-xs">Name (optional)</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div>
                        <Label htmlFor="email" className="text-xs">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label htmlFor="password" className="text-xs">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            disabled={loading}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : mode === "login" ? (
                            <LogIn className="h-4 w-4 mr-2" />
                        ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        {mode === "login" ? "Sign In" : "Create Account"}
                    </Button>

                    <div className="relative my-4">
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
                        onClick={() => toast.info("Passkey support coming soon!")}
                        disabled={loading}
                    >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Use Passkey
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        {mode === "login" ? (
                            <>
                                Don&apos;t have an account?{" "}
                                <button
                                    type="button"
                                    className="text-foreground underline"
                                    onClick={() => setMode("register")}
                                >
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <button
                                    type="button"
                                    className="text-foreground underline"
                                    onClick={() => setMode("login")}
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </form>
            </ResponsiveModal>
        </>
    )
}
