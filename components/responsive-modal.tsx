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
    className
}: ResponsiveModalProps) {
    // This hook is key - it swaps component based on screen size
    const isDesktop = useMediaQuery("(min-width: 768px)")

    // DESKTOP: Render standard Shadcn Dialog
    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
                <DialogContent className={className}>
                    {(title || description) && (
                        <DialogHeader>
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
                <div className="absolute right-4 top-4 z-50">
                    <DrawerClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white">
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </Button>
                    </DrawerClose>
                </div>
                {(title || description) && (
                    <DrawerHeader className="text-left pr-12">
                        {title && <DrawerTitle>{title}</DrawerTitle>}
                        {description && <DrawerDescription>{description}</DrawerDescription>}
                    </DrawerHeader>
                )}
                <div className="px-4 pb-8 overflow-y-auto">
                    {/* Auto-scroll container for content */}
                    {children}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
