'use client'

import { useState, useEffect } from 'react'
import { SecurityLoader } from '@/components/security-loader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Save, FolderOpen, Trash2, FileText, Clock, Users, Paperclip, Mail, ImageIcon, AlertCircle, Search, Loader2, Image as ImageIconLucide, AlertTriangle, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { EmailDraft, loadDrafts, saveDraft, deleteDraft } from '@/lib/drafts'
import { Attachment } from '@/lib/schemas'
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import { sanitizeHtmlPreview } from "@/lib/sanitize-html"

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
    const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false) // Visual State
    const [isSaving, setIsSaving] = useState(false)
    const [saveDialogOpen, setSaveDialogOpen] = useState(false)
    const [draftName, setDraftName] = useState('')
    const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')


    const safeLoadDrafts = async (isBackground = false) => {
        if (!isBackground) setIsLoading(true)
        try {
            // 1. Initial Load (Local DB - Instant)
            const local = await loadDrafts()
            setDrafts(local || [])
            if (!isBackground) setIsLoading(false) // Show data immediately

            // 2. Background Sync (Cloud)
            setIsBackgroundSyncing(true)
            // Dynamically import to safely call new function without breaking if file not fully reloaded (though in agent mode it is)
            const { syncDrafts } = await import('@/lib/drafts');
            // Force strict sync? No, standard sync is fine.
            await syncDrafts();

            // 3. Reload after sync
            const synced = await loadDrafts()
            setDrafts(synced || [])
        } catch (e) {
            console.error("Failed to load drafts:", e)
            if (!isBackground) toast.error("Error loading drafts.")
        } finally {
            if (!isBackground) setIsLoading(false)
            setIsBackgroundSyncing(false)
        }
    }

    // Load drafts on mount to show count, and refresh when modal opens
    useEffect(() => {
        safeLoadDrafts(); // Load immediately on mount
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (open) {
            safeLoadDrafts() // Refresh when modal opens

            // Poll for changes from other devices every 5s
            interval = setInterval(() => {
                if (!isSaving && !isBackgroundSyncing) {
                    safeLoadDrafts(true); // Silent background sync
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [open, isSaving, isBackgroundSyncing])

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
        if (!confirm("Do you really want to delete this draft?")) return

        try {
            await deleteDraft(id)
            // UPDATE LOCAL STATE ONLY (No Sync) to prevent "resurrection" race condition
            // The server is deleting it currently. If we sync now, we might get the old state back.
            // Next poll will confirm.
            const local = await loadDrafts()
            setDrafts(local || [])
            toast.success("Draft deleted")
        } catch (error: any) {
            console.error("Draft deletion failed:", error)
            toast.error("Draft deleted locally, but cloud sync failed. Try again.")
            // Still reload to show local state
            const local = await loadDrafts()
            setDrafts(local || [])
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
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-4xl w-full max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
                    <DialogHeader className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-white/50 dark:bg-[#181818]/50 backdrop-blur-sm space-y-4 shrink-0 z-10">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-xl font-bold tracking-tight">My Drafts</DialogTitle>
                            {isBackgroundSyncing && (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                            )}
                        </div>
                        {/* Search and Filters inside Header */}
                        <div className="flex gap-2 pt-1">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                                <Input
                                    placeholder="Search subject, name or recipient..."
                                    className="pl-9 h-10 text-sm bg-neutral-100/50 dark:bg-[#252525]/50 border-transparent focus:bg-white dark:focus:bg-[#252525] focus:ring-2 focus:ring-blue-500/20 transition-all w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col bg-neutral-50/30 dark:bg-[#0f0f0f]/30">
                        <ScrollArea className="flex-1 h-full">
                            {isLoading && drafts.length === 0 ? (
                                <div className="flex items-center justify-center py-20">
                                    <SecurityLoader />
                                </div>
                            ) : filteredDrafts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <div className="h-16 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                                        <FolderOpen className="h-8 w-8 opacity-40" />
                                    </div>
                                    <p className="text-base font-medium text-foreground">No drafts found</p>
                                    <p className="text-sm opacity-60 mt-1">Save a draft to see it here</p>
                                </div>
                            ) : (
                                <div className="p-6 pb-12 grid grid-cols-1 gap-4">
                                    {filteredDrafts.map((draft) => {
                                        const imageCount = countImagesInBody(draft.body);
                                        const attachmentCount = draft.attachments?.length || 0;

                                        return (
                                            <div
                                                key={draft.id}
                                                onClick={() => handleLoadDraft(draft)}
                                                className="group relative flex flex-col p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-[#1e1e1e] hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm h-[180px]"
                                            >
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <div className="min-w-0 flex-1 pr-6 space-y-1.5">
                                                        <h4 className="font-semibold text-base text-neutral-900 dark:text-neutral-100 line-clamp-1 transition-colors">
                                                            {draft.name}
                                                        </h4>
                                                        {draft.subject ? (
                                                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 line-clamp-1">
                                                                {draft.subject}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs font-medium text-neutral-400 italic">No subject</p>
                                                        )}
                                                        <div
                                                            className="text-xs text-muted-foreground line-clamp-3 leading-relaxed opacity-70"
                                                            dangerouslySetInnerHTML={{
                                                                __html: sanitizeHtmlPreview(draft.body) || "No content"
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-3 border-t border-dashed border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                                            {format(new Date(draft.updatedAt), 'MMM dd, HH:mm')}
                                                        </Badge>
                                                        {draft.recipients && draft.recipients.length > 0 && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground" title={`${draft.recipients.length} recipients`}>
                                                                <Users className="h-3 w-3" />
                                                                {draft.recipients.length}
                                                            </div>
                                                        )}
                                                        {(attachmentCount > 0 || imageCount > 0) && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Paperclip className="h-3 w-3" />
                                                                {attachmentCount + imageCount}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                                                        className="h-7 w-7 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors -mr-1"
                                                        title="Delete Draft"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
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

            {/* Save Dialog - Black & White Design */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-neutral-950 backdrop-blur-xl border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">{selectedDraftId ? "Update Draft" : "Save Draft"}</DialogTitle>
                        <div className="text-sm text-muted-foreground">Name your draft to easily find it later.</div>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                        {selectedDraftId && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium">
                                <RefreshCw className="h-3.5 w-3.5" />
                                Updating existing version
                            </div>
                        )}

                        {/* Explicit info about content */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                <span className="text-xs text-muted-foreground block mb-1">Recipients</span>
                                <div className="flex items-center gap-1.5 font-medium text-sm">
                                    <Users className="h-3.5 w-3.5 text-neutral-500" />
                                    {currentRecipients.length}
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                <span className="text-xs text-muted-foreground block mb-1">Attachments</span>
                                <div className="flex items-center gap-1.5 font-medium text-sm">
                                    <Paperclip className="h-3.5 w-3.5 text-neutral-500" />
                                    {currentAttachments.length} <span className="text-xs text-muted-foreground font-normal">(removed)</span>
                                </div>
                            </div>
                        </div>

                        {/* Warning about stripped content */}
                        <div className="flex gap-3 p-3 text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-400 rounded-lg">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-neutral-500" />
                            <p>
                                <strong>Note:</strong> Images and attachments are <span className="underline">not saved</span> with drafts to save space. They must be re-added.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Draft Name</label>
                            <Input
                                placeholder="e.g. Summer Party Invite v1"
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                autoFocus
                                className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 h-10"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setSaveDialogOpen(false)} className="hover:bg-neutral-100 dark:hover:bg-neutral-800">Cancel</Button>
                        <Button onClick={handleSaveDraft} disabled={!draftName.trim() || isSaving} className="bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Draft
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
