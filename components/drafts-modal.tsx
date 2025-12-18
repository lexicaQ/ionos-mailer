'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Save, FolderOpen, Trash2, FileText, Clock, Users, Paperclip, Mail, ImageIcon, AlertCircle, Search, Loader2, Image as ImageIconLucide, AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'
import { EmailDraft, loadDrafts, saveDraft, deleteDraft } from '@/lib/drafts'
import { Attachment } from '@/lib/schemas'
import { toast } from 'sonner'
import { cn } from "@/lib/utils"

interface DraftsModalProps {
    currentSubject: string
    currentBody: string
    currentRecipients: { email: string; id?: string }[]
    currentAttachments: Attachment[]
    onLoadDraft: (draft: EmailDraft) => void
    currentDraftId?: string | null
}

export function DraftsModal({
    currentSubject,
    currentBody,
    currentRecipients,
    currentAttachments,
    onLoadDraft,
    currentDraftId
}: DraftsModalProps) {
    const [open, setOpen] = useState(false)
    const [drafts, setDrafts] = useState<EmailDraft[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveDialogOpen, setSaveDialogOpen] = useState(false)
    const [draftName, setDraftName] = useState('')
    const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')


    const safeLoadDrafts = async () => {
        setIsLoading(true)
        try {
            const loaded = await loadDrafts()
            setDrafts(loaded || [])
        } catch (e) {
            console.error("Failed to load drafts:", e)
            toast.error("Error loading drafts.")
            setDrafts([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            safeLoadDrafts()
        }
    }, [open])

    const handleSaveDraft = async () => {
        if (!draftName.trim()) return

        setIsSaving(true);
        try {
            // Strip images as requested (optional, but requested previously). 
            // Do NOT strip empty lines (<p><br></p>) to preserve formatting.
            const cleanBody = currentBody.replace(/<img[^>]*>/g, '');

            await saveDraft({
                id: selectedDraftId || undefined,
                name: draftName.trim(),
                recipients: currentRecipients,
                subject: currentSubject,
                body: cleanBody, // No Images
                attachments: [] // No Attachments
            })

            await safeLoadDrafts()
            setSaveDialogOpen(false)
            setDraftName('')
            setSelectedDraftId(null)
            toast.success("Draft saved (text only)")
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error saving");
        } finally {
            setIsSaving(false);
        }
    }

    const handleLoadDraft = (draft: EmailDraft) => {
        try {
            if (!draft || typeof draft !== 'object') throw new Error("Invalid data")
            onLoadDraft(draft)
            setOpen(false)
        } catch (e: any) {
            console.error("Error loading draft:", e)
            toast.error("Draft could not be loaded")
        }
    }

    const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirm("Do you really want to delete this draft?")) {
            await deleteDraft(id)
            await safeLoadDrafts()
            toast.success("Draft deleted")
        }
    }

    const openSaveDialog = (existingDraft?: EmailDraft) => {
        if (existingDraft) {
            setDraftName(existingDraft.name)
            setSelectedDraftId(existingDraft.id)
        } else if (currentDraftId && drafts.find(d => d.id === currentDraftId)) {
            // Find existing in currently loaded list
            const current = drafts.find(d => d.id === currentDraftId)
            setDraftName(current?.name || '')
            setSelectedDraftId(currentDraftId)
        } else {
            setDraftName(currentSubject || `Draft ${format(new Date(), 'MMM dd HH:mm')}`)
            setSelectedDraftId(null)
        }
        setSaveDialogOpen(true)
    }

    const canSave = (currentSubject?.trim() || '') !== '' || (currentBody?.trim() || '') !== '' || (currentRecipients?.length || 0) > 0

    // Helper to count images in body (simple regex) - MUST be defined BEFORE use
    const countImagesInBody = (body: string) => {
        return (body.match(/<img/g) || []).length;
    }

    const filteredDrafts = drafts.filter(d => {
        const matchesSearch =
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.recipients?.some(r => r.email.toLowerCase().includes(searchTerm.toLowerCase()))

        return matchesSearch
    })

    return (
        <>
            {/* Buttons: Saved State */}
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openSaveDialog()}
                    disabled={!canSave || isSaving}
                    title="Save current state"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(true)}
                >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Drafts
                    {drafts.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 min-w-[20px] justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                            {drafts.length}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Load Drafts - styled as Full Popup Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-4xl w-full max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl bg-white dark:bg-[#121212] border-neutral-200 dark:border-neutral-800 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 subpixel-antialiased">
                    <DialogHeader className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#181818] space-y-4">
                        <DialogTitle className="text-lg font-semibold">My Drafts</DialogTitle>
                        {/* Search and Filters inside Header */}
                        <div className="flex gap-2 pt-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search subject, name or recipient..."
                                    className="pl-9 h-9 text-sm bg-neutral-100 dark:bg-[#252525] border-transparent focus:bg-white dark:focus:bg-[#252525] transition-colors w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#0f0f0f]">
                        <ScrollArea className="flex-1 h-full">
                            {isLoading && drafts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Loading drafts...</p>
                                </div>
                            ) : filteredDrafts.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No drafts found</p>
                                </div>
                            ) : (
                                <div className="p-6 pb-12 space-y-4">
                                    {filteredDrafts.map((draft) => {
                                        const imageCount = countImagesInBody(draft.body);
                                        const attachmentCount = draft.attachments?.length || 0;

                                        return (
                                            <div
                                                key={draft.id}
                                                onClick={() => handleLoadDraft(draft)}
                                                className="group relative flex flex-col p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1e1e1e] hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer shadow-sm"
                                            >
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <div className="min-w-0 flex-1 pr-8 space-y-1">
                                                        <h4 className="font-semibold text-base text-neutral-900 dark:text-neutral-100 line-clamp-1">{draft.name}</h4>
                                                        {draft.subject && <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 line-clamp-1">{draft.subject}</p>}
                                                        <div
                                                            className="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-80"
                                                            dangerouslySetInnerHTML={{
                                                                __html: draft.body
                                                                    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                                                                    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
                                                                    .replace(/<(img|iframe|object|embed)[^>]*>/gi, "")
                                                            }}
                                                        />
                                                    </div>
                                                    <Badge variant="outline" className="shrink-0 text-[10px] font-mono bg-neutral-50 dark:bg-[#252525] border-neutral-200 dark:border-neutral-800 text-neutral-500">
                                                        {format(new Date(draft.updatedAt), 'MMM dd')}
                                                    </Badge>
                                                </div>

                                                {/* Enhanced Meta Data display */}
                                                <div className="flex flex-wrap items-center gap-3 pt-3 mt-1 border-t border-neutral-100 dark:border-neutral-800/50">
                                                    {/* Recipients */}
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium" title={draft.recipients?.map(r => r.email).join(', ')}>
                                                        <Users className="h-3.5 w-3.5" />
                                                        {draft.recipients?.length || 0}
                                                    </div>

                                                    {/* Attachments */}
                                                    {attachmentCount > 0 && (
                                                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-medium" title={draft.attachments?.map(a => a.name).join(', ')}>
                                                            <Paperclip className="h-3.5 w-3.5" />
                                                            {attachmentCount} File{attachmentCount !== 1 ? 's' : ''}
                                                        </div>
                                                    )}

                                                    {/* Images */}
                                                    {imageCount > 0 && (
                                                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                                                            <ImageIconLucide className="h-3.5 w-3.5" />
                                                            {imageCount} Image{imageCount !== 1 ? 's' : ''}
                                                        </div>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 absolute right-3 bottom-3"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Save Dialog - Also converted to Dialog for consistency */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#121212] border-neutral-200 dark:border-neutral-800 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 subpixel-antialiased">
                    <DialogHeader>
                        <DialogTitle>{selectedDraftId ? "Update Draft" : "Save Draft"}</DialogTitle>
                        <div className="text-sm text-muted-foreground">Save your current progress to resume later.</div>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                        {selectedDraftId && (
                            <Badge variant="outline" className="mb-2 bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                                Overwrite existing draft
                            </Badge>
                        )}

                        {/* Warning about limited sync */}
                        <div className="flex gap-3 p-3 text-xs bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-500 rounded-lg">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <p>
                                <strong>Note:</strong> Images and attachments are <span className="underline">not saved</span> with drafts. Only text and recipients will be preserved.
                            </p>
                        </div>
                        {/* Explicit info about content */}
                        <div className="flex flex-wrap gap-3 text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                    {currentRecipients.length}
                                </span> Recipient{currentRecipients.length !== 1 ? 's' : ''}
                            </div>
                            {countImagesInBody(currentBody) > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <ImageIconLucide className="h-3.5 w-3.5" />
                                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                        {countImagesInBody(currentBody)}
                                    </span> Image{countImagesInBody(currentBody) !== 1 ? 's' : ''}
                                </div>
                            )}
                            {currentAttachments.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                        {currentAttachments.length}
                                    </span> File{currentAttachments.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Input
                                placeholder="Enter name..."
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                autoFocus
                                className="bg-neutral-50 dark:bg-[#1e1e1e] border-neutral-200 dark:border-neutral-800"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveDraft} disabled={!draftName.trim() || isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
