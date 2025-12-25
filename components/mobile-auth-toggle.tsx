"use client"

import * as React from "react"
import { LogOut, LogIn } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { AuthDialog } from "@/components/auth-dialog"

export function MobileAuthToggle() {
    const { data: session } = useSession()

    if (session?.user) {
        return (
            <div className="absolute top-4 left-4 z-[9999] md:hidden">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => signOut()}
                    className="h-10 w-10 rounded-full bg-white dark:bg-neutral-900 border shadow-lg text-black dark:text-white hover:text-destructive"
                    title="Sign out"
                >
                    <LogOut className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Sign out</span>
                </Button>
            </div>
        )
    }

    // If logged out, render the AuthDialog but override the trigger styling to match the round toggle
    // We can't easily "click" the dialog from here unless AuthDialog accepts a custom trigger.
    // Let's check AuthDialog. It usually has a default trigger button.
    // If AuthDialog doesn't accept a custom trigger prop, we might need to modify it or wrap it.
    // Let's assume for now we can wrap it or modify it. 
    // Actually, looking at previous usage `<AuthDialog />`, it likely renders its own button.

    // BETTER APPROACH:
    // Render AuthDialog with a custom trigger that looks like our round button.
    // I need to verify if AuthDialog accepts a `trigger` prop.
    // If not, I will update AuthDialog to accept `trigger` or `customTrigger`.

    // Wait, the previous view_file of AuthDialog didn't happen yet (it's in the queue).
    // I will write a placeholder implementation that assumes I can pass a trigger, or I'll modify AuthDialog.

    return (
        <div className="absolute top-4 left-4 z-[9999] md:hidden">
            <AuthDialog
                customTrigger={
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-white dark:bg-neutral-900 border shadow-lg text-black dark:text-white"
                        title="Sign in"
                    >
                        <LogIn className="h-[1.2rem] w-[1.2rem]" />
                        <span className="sr-only">Sign in</span>
                    </Button>
                }
            />
        </div>
    )
}
