"use client"

import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

interface ResponsiveModalProps {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    title?: string
    description?: string
    trigger?: React.ReactNode
    className?: string
}

export function ResponsiveModal({
    children,
    open,
    onOpenChange,
    title,
    description,
    trigger,
    className,
    headerActions,
    forceDialog,
    onOpenAutoFocus
}: ResponsiveModalProps & { headerActions?: React.ReactNode, forceDialog?: boolean, onOpenAutoFocus?: (event: Event) => void }) {
    // This hook is key - it swaps component based on screen size
    const isDesktop = useMediaQuery("(min-width: 768px)")

    // DESKTOP or FORCED DIALOG: Render standard Shadcn Dialog
    if (isDesktop || forceDialog) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
                <DialogContent className={className} onOpenAutoFocus={onOpenAutoFocus}>
                    {/* Header Actions - Positioned to the left of the Close button */}
                    {headerActions && (
                        <div className="absolute right-12 top-4 z-50 flex items-center gap-2">
                            {headerActions}
                        </div>
                    )}
                    {(title || description) && (
                        <DialogHeader className="text-left">
                            {title && <DialogTitle>{title}</DialogTitle>}
                            {description && <DialogDescription>{description}</DialogDescription>}
                        </DialogHeader>
                    )}
                    {children}
                </DialogContent>
            </Dialog>
        )
    }

    // MOBILE: Render Vaul Drawer (Sheet)
    // This allows native scroll handling and prevents body scroll locks
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
            <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="text-left pt-0 px-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                            {title && <DrawerTitle className="leading-snug">{title}</DrawerTitle>}
                            {description && <DrawerDescription className="line-clamp-2">{description}</DrawerDescription>}
                        </div>
                        <div className="flex items-center gap-2 -mt-1 shrink-0">
                            {headerActions}
                            <DrawerClose asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white">
                                    <span className="sr-only">Close</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </Button>
                            </DrawerClose>
                        </div>
                    </div>
                </DrawerHeader>
                <div className="px-4 pb-8 overflow-y-auto">
                    {children}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
