"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { emailFormSchema, EmailFormValues, SendResult } from "@/lib/schemas"
import { StatusView } from "@/components/status-view"
import { RecipientInput } from "@/components/recipient-input"
import { HistoryModal, HistoryBatch } from "@/components/history-modal"
import { LiveCampaignTracker } from "@/components/live-campaign-tracker"
import { SettingsDialog } from "@/components/settings-dialog"
import { AuthDialog } from "@/components/auth-dialog"
import { FileImportModal } from "@/components/file-import-modal"
import { ExtractionResult } from "@/lib/parsers"
import { SmtpConfig } from "@/lib/mail"
import { Send, Loader2, Clock, Sparkles, FileUp } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { PlaceholderPreviewDialog } from "@/components/placeholder-preview-dialog"
import { DraftsModal } from "@/components/drafts-modal"
import { EmailDraft, loadDrafts as loadLocalDrafts, saveDraft as saveLocalDraft } from "@/lib/drafts"
import { Attachment } from "@/lib/schemas"

const HISTORY_STORAGE_KEY = "ionos-mailer-history"
const DRAFTS_SYNC_KEY = "ionos-mailer-drafts-synced"

import { useSession } from "next-auth/react"
// ...

export function EmailForm() {
    const { data: session } = useSession()

    const [isSending, setIsSending] = useState(false)
    const [sendProgress, setSendProgress] = useState(0)
    const [currentResults, setCurrentResults] = useState<SendResult[]>([])
    const [history, setHistory] = useState<HistoryBatch[]>([])
    const [smtpSettings, setSmtpSettings] = useState<SmtpConfig | undefined>(undefined)
    const [durationMinutes, setDurationMinutes] = useState(60)
    const [useBackground, setUseBackground] = useState(false)
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([])
    const [loadedRecipients, setLoadedRecipients] = useState<{ email: string; id?: string }[]>([])
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
    const [editorKey, setEditorKey] = useState(0) // Logic to force-reset editor on draft load
    const [fileImportOpen, setFileImportOpen] = useState(false)

    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
            if (stored) {
                setHistory(JSON.parse(stored))
            }
        } catch (e) {
            console.error("Failed to load history:", e)
        }
    }, [])

    // Sync history from cloud when logged in
    useEffect(() => {
        if (!session?.user) return

        const syncHistory = async () => {
            try {
                // 1. Fetch server history
                const res = await fetch("/api/sync/history")
                if (!res.ok) return
                const serverData: HistoryBatch[] = await res.json()

                // 2. Merge with local history (prefer local if conflict? or server? History is append-only mostly)
                setHistory(prev => {
                    // Create map by ID
                    const map = new Map<string, HistoryBatch>()

                    // Add local first
                    prev.forEach(b => map.set(b.id, b))

                    // Add server (overwriting if ID match? Usually harmless for history)
                    // Server might have more up-to-date stats (clickedCount) if we implemented that.
                    // Let's assume server is truth for properties, but we want union of items.
                    serverData.forEach(b => map.set(b.id, { ...map.get(b.id), ...b }))

                    const merged = Array.from(map.values()).sort((a, b) =>
                        new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
                    )

                    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(merged))
                    return merged
                })
            } catch (error) {
                console.error("History sync failed", error)
            }
        }

        const syncDrafts = async () => {
            try {
                // 1. Load local drafts
                const localDrafts = await loadLocalDrafts()

                // 2. Push to server to merge
                const res = await fetch("/api/sync/drafts", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ drafts: localDrafts })
                })

                if (res.ok) {
                    const data = await res.json()
                    if (data.merged) {
                        // 3. Update local with merged data
                        // This ensures we get drafts from other devices
                        for (const draft of data.merged) {
                            await saveLocalDraft(draft)
                        }
                        // console.log("Drafts synced:", data.merged.length)
                    }
                }
            } catch (e) {
                console.error("Drafts sync failed", e)
            }
        }

        syncHistory()
        syncDrafts()
    }, [session])

    const saveHistoryToServer = async (batch: HistoryBatch) => {
        if (!session?.user) return
        try {
            await fetch("/api/sync/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batches: [batch] }),
            })
        } catch (e) {
            console.error("Failed to push history batch", e)
        }
    }

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: {
            recipients: [],
            subject: "",
            body: "",
            attachments: [],
            smtpSettings: undefined
        }
    })

    const recipients = form.watch("recipients");

    const onSubmit = useCallback(async (data: EmailFormValues) => {
        if (!smtpSettings) {
            toast.error("Please configure the SMTP settings first (gear icon).");
            return;
        }

        setIsSending(true);
        setSendProgress(0);
        setCurrentResults([]);

        // User ID is now handled server-side via session authentication

        const payload = {
            ...data,
            smtpSettings,
            durationMinutes: useBackground ? durationMinutes : 0,
        };

        try {
            const endpoint = useBackground ? "/api/campaigns" : "/api/send-emails";

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Sending failed");
            }

            const resultData = await response.json();

            if (useBackground) {
                toast.success(`Campaign started! ${resultData.jobCount} emails scheduled.`);
                setCurrentResults([]);
            } else {
                const results: SendResult[] = resultData.results;
                setCurrentResults(results);
                setSendProgress(100);

                const successCount = results.filter(r => r.success).length;

                const newBatch: HistoryBatch = {
                    id: crypto.randomUUID(),
                    sentAt: new Date().toISOString(),
                    total: results.length,
                    results: results, // Include results for details
                    success: successCount,
                    failed: results.length - successCount,
                    subject: data.subject,
                    status: 'completed',
                    body: data.body, // Use passed data
                    recipientList: data.recipients // Use passed data
                };

                // Update local state and storage
                setHistory(prev => {
                    const updated = [newBatch, ...prev];
                    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
                    return updated;
                });

                // Push to cloud if logged in
                saveHistoryToServer(newBatch);

                toast.success("Delivery completed");
            }

        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    }, [smtpSettings, useBackground, durationMinutes, session])

    // Keyboard shortcut: Cmd+S or Ctrl+S to send
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                if (!isSending) {
                    form.handleSubmit(onSubmit)()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [form, isSending, onSubmit])

    // Save history to localStorage when it changes
    useEffect(() => {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
        } catch (e) {
            console.error("Failed to save history:", e)
        }
    }, [history])

    // Close App Warning - Show only ONCE
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isSending && useBackground) {
                // Check if user has seen warning
                const hasSeenWarning = localStorage.getItem("ionos-mailer-seen-warning");
                if (!hasSeenWarning) {
                    e.preventDefault();
                    e.returnValue = "The delivery will continue in the background, but with a delay. Do you really want to close?";
                    localStorage.setItem("ionos-mailer-seen-warning", "true");
                    return e.returnValue;
                }
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isSending, useBackground]);

    const handleRecipientsChange = (newRecipients: { email: string; id: string }[]) => {
        form.setValue("recipients", newRecipients, { shouldValidate: true });
    }

    const handleDeleteBatch = (id: string) => {
        setHistory(prev => prev.filter(b => b.id !== id));
        toast.success("Campaign deleted");
    }

    const handleClearAllHistory = () => {
        setHistory([]);
        toast.success("History cleared");
    }

    const handleLoadDraft = useCallback((draft: EmailDraft) => {
        try {
            // console.log('[EmailForm] Loading draft:', draft.name);

            // Helper to ensure line breaks are preserved in Tiptap (which treats \n as space in HTML)
            const ensureHtml = (content: string) => {
                if (!content) return "";
                // Simple check for HTML tags
                const hasTags = /<[a-z][\s\S]*>/i.test(content);
                if (!hasTags) {
                    // Convert plain text newlines to <br>
                    return content.replace(/\n/g, '<br>');
                }
                return content;
            };

            // Sanitization Helper: AGGRESSIVELY remove all images to prevent blob/data URL issues
            const sanitizeContent = (html: string) => {
                if (!html) return "";

                // Ensure we have HTML structure first (preserve newlines)
                let clean = ensureHtml(html);

                // Step 1: Remove ALL img tags completely (images should be attachments, not inline)
                clean = clean.replace(/<img[^>]*>/gi, '');

                // Step 2: Remove any remaining blob: or data: URLs that might be elsewhere
                clean = clean.replace(/blob:[^\s"']*/gi, '');
                clean = clean.replace(/data:image\/[^;]+;base64,[^\s"']*/gi, '');

                // Step 3: Clean up any empty paragraphs that might result
                clean = clean.replace(/<p>\s*<\/p>/gi, '');

                return clean || '<p></p>'; // Ensure non-empty for Tiptap
            };

            const safeBody = sanitizeContent(draft.body);

            // 1. Reset Form State first
            form.reset({
                subject: draft.subject,
                body: safeBody,
                attachments: draft.attachments || [],
                recipients: [], // Will be set below
                smtpSettings: smtpSettings // Persist settings
            });

            // 2. State Updaters
            setCurrentAttachments(draft.attachments || []);

            // 3. Force Editor Re-mount prevents Tiptap internal crashes/loops
            setEditorKey(prev => prev + 1);

            // 4. Recipients Handling (with safety check)
            const recipientsWithIds = (draft.recipients || []).map(r => ({
                email: r.email,
                id: r.id || crypto.randomUUID()
            }));
            form.setValue('recipients', recipientsWithIds, { shouldValidate: true });
            setLoadedRecipients(recipientsWithIds);

            setCurrentDraftId(draft.id);

            // Safety check for user feedback
            if (safeBody !== draft.body) {
                toast.success(`Draft "${draft.name}" loaded (Invalid images removed)`);
            } else {
                toast.success(`Draft "${draft.name}" loaded`);
            }
        } catch (error: any) {
            console.error("Critical error loading draft:", error);
            toast.error("Error loading draft: " + error.message);
        }
    }, [form, smtpSettings]);

    // Handle file import results
    const handleFileImport = useCallback((result: ExtractionResult) => {
        try {
            // console.log('[EmailForm] File import result:', result.fileName);

            // Set recipients if found
            if (result.detectedRecipients.length > 0) {
                const currentRecipients = form.getValues('recipients') || [];
                const newRecipients = result.detectedRecipients.map(r => ({
                    email: r.email,
                    id: r.id || crypto.randomUUID()
                }));

                // Deduplicate and Merge Robustly
                const uniqueMap = new Map();

                // 1. Keep existing recipients
                currentRecipients.forEach(r => uniqueMap.set(r.email.toLowerCase(), r));

                // 2. Add new unique recipients
                let addedCount = 0;
                newRecipients.forEach(r => {
                    if (!uniqueMap.has(r.email.toLowerCase())) {
                        uniqueMap.set(r.email.toLowerCase(), r);
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    const merged = Array.from(uniqueMap.values());
                    form.setValue('recipients', merged, { shouldValidate: true });
                    setLoadedRecipients(merged);
                }
            }

            // Set subject if provided and current is empty
            const currentSubject = form.getValues('subject') || '';
            if (result.subjectSuggestion && !currentSubject.trim()) {
                form.setValue('subject', result.subjectSuggestion);
            }

            // Set body if provided and current is empty
            const currentBody = form.getValues('body') || '';
            if (result.bodySuggestion && (!currentBody.trim() || currentBody === '<p></p>')) {
                // Ensure newlines are preserved for imported text
                const ensureHtml = (content: string) => {
                    const hasTags = /<[a-z][\s\S]*>/i.test(content);
                    return hasTags ? content : content.replace(/\n/g, '<br>');
                };
                form.setValue('body', ensureHtml(result.bodySuggestion));
                setEditorKey(prev => prev + 1); // Force editor refresh
            }

            // Show warnings if any
            if (result.warnings.length > 0) {
                toast.info(result.warnings.join('. '));
            }
        } catch (error: any) {
            console.error('Error applying file import:', error);
            toast.error('Error applying import');
        }
    }, [form]);

    return (
        <div className="p-6 md:p-8 space-y-8">
            {/* Header Bar */}
            {/* Header Bar */}
            <div className="flex flex-col md:flex-row md::items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {/* Mobile button moved to layout/global */}
                    <div className="h-10 w-10 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-lg shrink-0">
                        <Sparkles className="h-5 w-5 text-white dark:text-black" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg">New Message</h2>
                        <p className="text-sm text-neutral-500">Send emails to multiple recipients</p>
                    </div>
                </div>

                {/* Actions Grid for Mobile, Flex for Desktop */}
                <div className="flex flex-nowrap justify-end gap-2 w-full sm:w-auto items-center overflow-x-auto no-scrollbar py-1">
                    <DraftsModal
                        currentSubject={form.watch('subject')}
                        currentBody={form.watch('body')}
                        currentRecipients={form.watch('recipients')}
                        currentAttachments={currentAttachments}
                        onLoadDraft={handleLoadDraft}
                        currentDraftId={currentDraftId}
                    />
                    <LiveCampaignTracker />
                    <HistoryModal
                        batches={history}
                        onDeleteBatch={handleDeleteBatch}
                        onClearAll={handleClearAllHistory}
                    />
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                        <SettingsDialog onSettingsChange={setSmtpSettings} currentSettings={smtpSettings} />
                        <AuthDialog />
                    </div>
                </div>
            </div>

            {/* Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-semibold">Subject</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g. Invitation to Summer Party 2024"
                                        {...field}
                                        disabled={isSending}
                                        className="h-12 text-base"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <RecipientInput
                        onRecipientsChange={handleRecipientsChange}
                        disabled={isSending}
                        externalRecipients={loadedRecipients}
                        customAction={
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFileImportOpen(true)}
                                className="gap-2 border"
                                title="Load email addresses from file"
                            >
                                <FileUp className="h-4 w-4" />
                                Import Email Addresses
                            </Button>
                        }
                    />
                    {form.formState.errors.recipients && (
                        <p className="text-sm font-medium text-destructive dark:text-red-500">
                            {form.formState.errors.recipients.message}
                        </p>
                    )}

                    <FormField
                        control={form.control}
                        name="body"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-semibold">Message</FormLabel>
                                <FormControl>
                                    <RichTextEditor
                                        key={editorKey} // Force reset on load
                                        value={field.value}
                                        onChange={field.onChange}
                                        initialAttachments={currentAttachments}
                                        onAttachmentsChange={(atts) => {
                                            form.setValue('attachments', atts);
                                            setCurrentAttachments(atts);
                                        }}
                                        placeholder="Enter your message here..."
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Background Mode Section */}
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-white dark:text-black" />
                                </div>
                                <div>
                                    <Label htmlFor="bg-mode" className="font-semibold cursor-pointer">Background Delivery</Label>
                                    <p className="text-xs text-neutral-500">Emails are sent distributed over time</p>
                                </div>
                            </div>
                            <Switch id="bg-mode" checked={useBackground} onCheckedChange={setUseBackground} />
                        </div>

                        {useBackground && (
                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold">Campaign Name (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Newsletter December 2024"
                                                    {...field}
                                                    disabled={isSending}
                                                    className="h-10"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label className="text-sm font-medium">Distribution Duration</Label>
                                        <span className="text-sm font-mono bg-white dark:bg-neutral-800 px-3 py-1 rounded-lg shadow-sm">
                                            {durationMinutes >= 60
                                                ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`
                                                : `${durationMinutes} min`
                                            }
                                        </span>
                                    </div>
                                    <Slider
                                        value={[durationMinutes]}
                                        min={1} // Minimum 1 minute
                                        max={1440} // 24 hours
                                        step={1}
                                        onValueChange={(vals) => setDurationMinutes(vals[0])}
                                    />
                                    <div className="flex justify-between text-xs text-neutral-400">
                                        <span>1 min</span>
                                        <span>24 hours</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
                                        <p className="text-sm font-semibold">Delivery Schedule</p>
                                        <p className="text-xs font-mono">{recipients.length} Recipients</p>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Interval:</span>
                                            <span className="font-mono">
                                                {recipients.length > 1
                                                    ? `Every ${(durationMinutes / (recipients.length - 1)).toFixed(1)} minutes`
                                                    : "Immediate"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Start:</span>
                                            <span className="font-mono">Immediate</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">End approx.:</span>
                                            <span className="font-mono">
                                                {recipients.length > 1
                                                    ? format(new Date(Date.now() + durationMinutes * 60000), "HH:mm")
                                                    : "Immediate"}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                        The browser does not need to stay open. The server handles the delivery.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <PlaceholderPreviewDialog
                            recipients={recipients}
                            subject={form.watch("subject")}
                            body={form.watch("body")}
                        />
                        <Button
                            type="submit"
                            disabled={isSending || recipients.length === 0}
                            size="lg"
                            className="flex-1 h-14 text-lg font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100 shadow-md transition-all"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {useBackground ? "Creating Campaign..." : "Sending Emails..."}
                                </>
                            ) : (
                                <>
                                    {useBackground ? <Clock className="mr-2 h-5 w-5" /> : <Send className="mr-2 h-5 w-5" />}
                                    {useBackground ? "Start Campaign" : `Send ${recipients.length} Email${recipients.length !== 1 ? 's' : ''}`}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>



            {/* File Import Modal */}
            <FileImportModal
                open={fileImportOpen}
                onOpenChange={setFileImportOpen}
                onImport={handleFileImport}
            />
        </div>
    )
}
