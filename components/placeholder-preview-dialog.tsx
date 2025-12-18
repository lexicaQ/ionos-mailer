"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Eye, Loader2, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PlaceholderPreviewDialogProps {
    recipients: { email: string; id?: string }[]
    subject: string
    body: string
}

export function PlaceholderPreviewDialog({ recipients, subject, body }: PlaceholderPreviewDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedEmail, setSelectedEmail] = useState<string>("")
    const [companyName, setCompanyName] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [hasScraped, setHasScraped] = useState(false)

    // Select first recipient by default when opening
    useEffect(() => {
        if (isOpen && recipients.length > 0 && !selectedEmail) {
            setSelectedEmail(recipients[0].email)
        }
    }, [isOpen, recipients, selectedEmail])

    // Fetch company name when selection changes
    useEffect(() => {
        if (selectedEmail && isOpen) {
            fetchCompanyForPreview(selectedEmail)
        }
    }, [selectedEmail, isOpen])

    const fetchCompanyForPreview = async (email: string) => {
        setIsLoading(true)
        setHasScraped(false)
        setCompanyName(null)
        try {
            const res = await fetch("/api/preview-company", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            })
            if (res.ok) {
                const data = await res.json()
                setCompanyName(data.companyName)
                setHasScraped(true)
            }
        } catch (error) {
            console.error("Preview failed", error)
        } finally {
            setIsLoading(false)
        }
    }

    // Helper to replace and highlight
    const getPreviewContent = (text: string) => {
        const placeholderRegex = /(XXX|xxx|{{Company}}|{{Firma}}|\[Company\]|\[Firma\])/gi;

        if (!text) return <span className="text-neutral-400 italic">Leer</span>;

        if (!placeholderRegex.test(text)) {
            return <span>{text}</span>;
        }

        const parts = text.split(placeholderRegex);
        return (
            <span>
                {parts.map((part, i) => {
                    if (part.match(placeholderRegex)) {
                        return (
                            <span key={i} className={`font-bold px-1 rounded ${companyName ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                                {companyName || part}
                            </span>
                        )
                    }
                    return <span key={i}>{part}</span>
                })}
            </span>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-14 w-14 shrink-0" title="Vorschau & Platzhalter prüfen">
                    <Eye className="h-6 w-6" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Vorschau & Platzhalter</DialogTitle>
                    <DialogDescription>
                        Prüfen Sie, wie die E-Mail für einen bestimmten Empfänger aussehen wird.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Recipient Selection */}
                    <div className="space-y-2">
                        <Label>Empfänger wählen</Label>
                        <div className="flex gap-2">
                            <Select value={selectedEmail} onValueChange={setSelectedEmail} disabled={recipients.length === 0}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Empfänger wählen..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {recipients.map((r) => (
                                        <SelectItem key={r.id || r.email} value={r.email}>
                                            {r.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => fetchCompanyForPreview(selectedEmail)}
                                disabled={!selectedEmail || isLoading}
                                title="Erneut prüfen"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Status Info */}
                    {selectedEmail && (
                        <div className="space-y-2">
                            <div className={`p-3 rounded-lg flex items-center justify-between gap-3 border ${isLoading ? "bg-neutral-50 border-neutral-200 dark:bg-neutral-900/50 dark:border-neutral-800" :
                                companyName ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50" :
                                    "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900/50"
                                }`}>
                                <div className="flex items-center gap-3">
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 text-neutral-500 animate-spin" />
                                    ) : companyName ? (
                                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                    )}

                                    <div className="text-sm">
                                        {isLoading ? (
                                            <p className="text-neutral-600 dark:text-neutral-400">Analysiere Domain...</p>
                                        ) : companyName ? (
                                            <p className="font-medium text-green-800 dark:text-green-300">
                                                Firma erkannt: <strong>{companyName}</strong>
                                            </p>
                                        ) : (
                                            <div className="text-yellow-800 dark:text-yellow-300">
                                                <p className="font-medium">Keine Firma erkannt.</p>
                                                <p className="text-xs opacity-90 mt-0.5">Platzhalter werden nicht ersetzt.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Domain Link - Moved Below */}
                            {selectedEmail.includes('@') && (
                                <div className="px-1">
                                    <a
                                        href={`https://${selectedEmail.split('@')[1]}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                                    >
                                        <span className="opacity-70">Website:</span>
                                        <span className="font-medium group-hover:underline">{selectedEmail.split('@')[1]}</span>
                                        <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview Content */}
                    <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Betreff</Label>
                            <div className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-medium">
                                {getPreviewContent(subject)}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nachricht</Label>
                            <div className="p-4 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm whitespace-pre-wrap min-h-[80px] max-h-[200px] overflow-y-auto">
                                {/* Using a div + dangerouslySetInnerHTML is risky for preview if we don't sanitize, 
                                    but here we want to show text mainly. Since RichTextEditor produces HTML, we should strip tags or render carefully.
                                    For now, let's just show text content if possible, or render it safest way.
                                    Actually, reusing getPreviewContent on HTML string is tricky because it might replace inside tags.
                                    
                                    Better approach: Just strip HTML tags for the preview text to keep it simple and safe?
                                    Or: Use a parser. 
                                    
                                    Let's try a simple approach: Render html but replace carefully? 
                                    Actually, for now, let's just strip HTML to show the TEXT logic, as that's what matters for placeholders.
                                    Or better: Show the raw HTML if it's simple, or strip tags.
                                 */}
                                <div className="prose dark:prose-invert max-w-none text-sm">
                                    {/* Simple replace on the HTML string. It's visual only. */}
                                    <div dangerouslySetInnerHTML={{
                                        // User requested to hide inline images in preview, so we strip <img> tags
                                        __html: body
                                            .replace(/<img[^>]*>/gi, '') // Remove images
                                            .replace(/(XXX|xxx|{{Company}}|{{Firma}}|\[Company\]|\[Firma\])/gi, (match) => {
                                                return `<span class="font-bold px-1 rounded ${companyName ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}">${companyName || match}</span>`
                                            })
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
