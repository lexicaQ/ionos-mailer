"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { Send, Loader2, Clock, Sparkles, FileUp, Info, Mail } from "lucide-react"
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
    const [startTime, setStartTime] = useState<string>("")
    const [useBackground, setUseBackground] = useState(false)
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([])
    const [loadedRecipients, setLoadedRecipients] = useState<{ email: string; id?: string }[]>([])
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
    const [editorKey, setEditorKey] = useState(0) // Logic to force-reset editor on draft load
    const [fileImportOpen, setFileImportOpen] = useState(false)

    const [isHistorySyncing, setIsHistorySyncing] = useState(false)
    const historyManuallyCleared = useRef(false) // Track if user cleared history
    const [startImmediately, setStartImmediately] = useState(false) // Changed: default to scheduled
    const [isBackgroundForced, setIsBackgroundForced] = useState(false)
    const [isValidating, setIsValidating] = useState(false)
    const [intervalMinutes, setIntervalMinutes] = useState(6) // NEW: Campaign interval in minutes

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

    const syncHistory = useCallback(async (force = false) => {
        if (!session?.user || historyManuallyCleared.current) {
            console.log('[syncHistory] Skipping - no session or manually cleared');
            return;
        }

        // TTL CACHING LOGIC (5 Minutes)
        if (!force) {
            const lastSync = localStorage.getItem("ionos-mailer-history-last-sync");
            if (lastSync) {
                const age = Date.now() - parseInt(lastSync, 10);
                if (age < 300000) { // 5 minutes
                    console.log(`[syncHistory] Cache is fresh (${Math.floor(age / 1000)}s old). Skipping fetch.`);
                    return;
                }
            }
        }

        console.log('[syncHistory] Starting history sync...');
        setIsHistorySyncing(true)
        try {
            // 1. Fetch server history
            // We use 'no-store' or timestamp to ensure fresh data
            const res = await fetch("/api/sync/history?t=" + Date.now(), {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!res.ok) {
                console.error('[syncHistory] API error:', res.status, res.statusText);
                return;
            }
            const serverData: HistoryBatch[] = await res.json()
            console.log(`[syncHistory] Got ${serverData.length} history batches from server`);

            // RACED CONDITION CHECK: If user cleared history while we were fetching, STOP.
            if (historyManuallyCleared.current && serverData.length > 0) {
                console.log("[syncHistory] ⚠️ Refusing to merge stale server data into cleared local history");
                return;
            }

            // 2. Server is source of truth - use server data directly
            // This ensures deletions on other devices are synced
            setHistory(() => {
                // Final safety check inside functional update
                if (historyManuallyCleared.current) {
                    console.log('[syncHistory] Cleared flag is set, returning empty');
                    return [];
                }

                // Server data IS the truth - local items not in server are deleted
                const serverIds = new Set(serverData.map(b => b.id));
                console.log('[syncHistory] Server batch IDs:', Array.from(serverIds));

                // Use server data as base, sorted by date
                const result = [...serverData].sort((a, b) =>
                    new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
                );

                console.log(`[syncHistory] Replacing local history with ${result.length} server batches`);
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(result))

                // UPDATE TTL TIMESTAMP
                localStorage.setItem("ionos-mailer-history-last-sync", Date.now().toString());

                return result
            })
        } catch (error) {
            console.error("[syncHistory] Sync failed:", error)
        } finally {
            setIsHistorySyncing(false)
        }
        console.log('[syncHistory] Sync complete');
    }, [session])


    // NOTE: Removed automatic sync on page load to reduce compute usage
    // History and Drafts now sync ONLY when user opens the modal
    // This reduces unnecessary API calls by ~30%

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

    // Auto-enable background mode if more than 10 recipients
    // Using toast ID to prevent duplicate notifications
    useEffect(() => {
        if (recipients?.length > 10) {
            if (!useBackground) {
                setUseBackground(true)
                // Toast ID 'background-forced' ensures only one notification even if effect runs multiple times
                toast.info("Campaign enabled automatically for more than 10 recipients.", {
                    duration: 5000,
                    id: "background-forced"
                })
            }
            setIsBackgroundForced(true)
        } else {
            setIsBackgroundForced(false)
        }
    }, [recipients?.length]) // Removed useBackground from deps to prevent double trigger

    // Reset start time when immediate mode is enabled
    useEffect(() => {
        if (startImmediately) {
            setStartTime("")
        }
    }, [startImmediately])

    // SMART SCHEDULING: Round to next 5-minute mark when campaign is enabled
    useEffect(() => {
        if (useBackground && !startImmediately && !startTime) {
            const roundToNext5Minutes = (date: Date): Date => {
                const minutes = date.getMinutes();
                const roundedMinutes = Math.ceil((minutes + 1) / 5) * 5; // +1 to ensure future time
                const newDate = new Date(date);

                if (roundedMinutes >= 60) {
                    newDate.setHours(newDate.getHours() + 1);
                    newDate.setMinutes(0);
                } else {
                    newDate.setMinutes(roundedMinutes);
                }

                newDate.setSeconds(0);
                newDate.setMilliseconds(0);
                return newDate;
            };

            const smartStart = roundToNext5Minutes(new Date());

            // Format as local datetime-local string (YYYY-MM-DDTHH:mm) in USER'S timezone
            const year = smartStart.getFullYear();
            const month = String(smartStart.getMonth() + 1).padStart(2, '0');
            const day = String(smartStart.getDate()).padStart(2, '0');
            const hours = String(smartStart.getHours()).padStart(2, '0');
            const mins = String(smartStart.getMinutes()).padStart(2, '0');
            const localDateTimeString = `${year}-${month}-${day}T${hours}:${mins}`;

            setStartTime(localDateTimeString);
        }
    }, [useBackground, startImmediately])

    // RECOVERY: Check for unsaved content from previous session
    useEffect(() => {
        const recoveryData = localStorage.getItem('ionos-mailer-recovery');
        if (recoveryData) {
            try {
                const data = JSON.parse(recoveryData);
                const savedAt = new Date(data.savedAt);
                const ageMinutes = (Date.now() - savedAt.getTime()) / 60000;

                // Only offer recovery for data less than 24 hours old
                if (ageMinutes < 1440) {
                    toast(
                        "Unsaved content found from your previous session",
                        {
                            duration: 15000,
                            action: {
                                label: "Restore",
                                onClick: () => {
                                    // Restore content
                                    if (data.subject) form.setValue('subject', data.subject);
                                    if (data.body) {
                                        form.setValue('body', data.body);
                                        setEditorKey(prev => prev + 1); // Force editor refresh
                                    }
                                    if (data.recipients?.length > 0) {
                                        const recipientsWithIds = data.recipients.map((r: any) => ({
                                            email: r.email,
                                            id: r.id || crypto.randomUUID()
                                        }));
                                        form.setValue('recipients', recipientsWithIds);
                                        setLoadedRecipients(recipientsWithIds);
                                    }
                                    toast.success("Content restored!");
                                    localStorage.removeItem('ionos-mailer-recovery');
                                }
                            },
                            onDismiss: () => {
                                // User dismissed - clear recovery data
                                localStorage.removeItem('ionos-mailer-recovery');
                            }
                        }
                    );
                } else {
                    // Data too old - clear it
                    localStorage.removeItem('ionos-mailer-recovery');
                }
            } catch (e) {
                // Invalid data - clear it
                localStorage.removeItem('ionos-mailer-recovery');
            }
        }
    }, []); // Run once on mount

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
            startTime: useBackground && startTime ? new Date(startTime).toISOString() : undefined,
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
                if (errorData.details?.message) {
                    throw new Error(errorData.details.message);
                }
                throw new Error(errorData.error || "Sending failed");
            }

            const resultData = await response.json();

            if (useBackground) {
                toast.success(`Campaign started! ${resultData.jobCount} emails scheduled.`);
                setCurrentResults([]);

                // Trigger Cron Job immediately (Fire & Forget from Client)
                // This makes the UI feel instant as we don't wait for the first batch to process
                fetch("/api/cron/process", {
                    method: 'GET',
                    headers: { 'x-manual-trigger': 'true' }
                }).catch(e => console.error("Background trigger failed (harmless):", e));

                // Signal Live Tracker to update INSTANTLY
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('campaign-created'));
                }
            } else {
                // Direct Send Mode: Server creates Campaign with jobs
                const results: SendResult[] = resultData.results;
                setCurrentResults(results);
                setSendProgress(100);

                // OPTIMISTIC: Create local history batch immediately for instant display
                const optimisticBatch: HistoryBatch = {
                    id: resultData.campaignId || crypto.randomUUID(),
                    sentAt: new Date().toISOString(),
                    results: results,
                    total: results.length,
                    success: results.filter(r => r.success || r.status === 'success').length,
                    failed: results.filter(r => !r.success && r.status !== 'waiting').length,
                    subject: data.subject,
                    status: 'processing'
                };

                // Add to history instantly
                setHistory(prev => [optimisticBatch, ...prev]);
                localStorage.setItem("ionos-mailer-history", JSON.stringify([optimisticBatch, ...history]));

                // Reset manual clear flag to allow sync
                historyManuallyCleared.current = false;

                // Sync from server in background to get final status
                syncHistory().catch(e => console.error('History sync failed:', e));

                // Trigger cron to process the pending jobs immediately
                fetch("/api/cron/process", {
                    method: 'GET',
                    headers: { 'x-manual-trigger': 'true' }
                }).catch(e => console.error("Cron trigger failed:", e));

                // Signal Live Tracker to update  
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('campaign-created'));
                    window.dispatchEvent(new Event('email-sent')); // Instant sync
                }

                toast.success("Delivery queued - emails will be sent shortly. Check History for status.");
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

    // UNSAVED CHANGES WARNING - Prevent accidental data loss
    // Detects if form has content and prompts before close
    useEffect(() => {
        // Helper to check if form has meaningful content
        const hasUnsavedContent = () => {
            const subject = form.getValues('subject') || '';
            const body = form.getValues('body') || '';
            const recipients = form.getValues('recipients') || [];

            // Check if body has actual content (not just empty HTML tags)
            const bodyHasContent = body.replace(/<[^>]*>/g, '').trim().length > 0;

            return subject.trim().length > 0 || bodyHasContent || recipients.length > 0;
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Only warn if there's unsaved content and NOT currently sending
            if (!isSending && hasUnsavedContent()) {
                e.preventDefault();
                // Modern browsers ignore custom messages, but we still need to set this
                e.returnValue = "You have unsaved content. Are you sure you want to leave?";

                // AUTO-SAVE attempt before page unload (sync, limited time)
                // This is a best-effort save - browsers may kill it
                const subject = form.getValues('subject') || '';
                const body = form.getValues('body') || '';
                const recipients = form.getValues('recipients') || [];

                // Use localStorage as a quick recovery mechanism  
                // (IndexedDB is async and may not complete)
                try {
                    const recoveryData = {
                        subject,
                        body,
                        recipients,
                        savedAt: new Date().toISOString()
                    };
                    localStorage.setItem('ionos-mailer-recovery', JSON.stringify(recoveryData));
                } catch (err) {
                    // Best effort - ignore errors
                }

                return e.returnValue;
            }

            // Also warn during active sending (original behavior)
            if (isSending && useBackground) {
                e.preventDefault();
                e.returnValue = "Emails are being sent. Are you sure you want to leave?";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isSending, useBackground, form]);

    const handleRecipientsChange = (newRecipients: { email: string; id: string }[]) => {
        form.setValue("recipients", newRecipients, { shouldValidate: true });
    }

    const handleDeleteBatch = async (id: string) => {
        // OPTIMISTIC: Remove from UI instantly
        const previousHistory = [...history];
        const updated = history.filter(b => b.id !== id);
        setHistory(updated);

        try {
            const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            toast.success("Entry deleted", { duration: 1500 });
        } catch (e) {
            // Revert on failure
            setHistory(previousHistory);
            toast.error("Failed to delete entry");
        }
    }

    const handleClearAllHistory = async () => {
        // Optimistic: Clear local immediately BEFORE any async
        historyManuallyCleared.current = true; // Prevent auto-sync refill
        const previousHistory = [...history];
        setHistory([]); // Instantly set to empty - this updates the button count too!
        localStorage.removeItem("ionos-mailer-history");

        try {
            // Collect all IDs to ensure we delete EXACTLY what the user sees
            const idsToDelete = previousHistory.map(h => h.id);

            // Delete from server - this is the source of truth
            const res = await fetch('/api/history', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToDelete })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Server delete failed');
            }

            console.log(`Deleted ${data.count} history entries from server`);
            toast.success("History cleared", { duration: 1500 });
        } catch (e) {
            console.error('Failed to clear history from server:', e);
            // Revert on error
            setHistory(previousHistory);
            localStorage.setItem("ionos-mailer-history", JSON.stringify(previousHistory));
            historyManuallyCleared.current = false;
            toast.error("Failed to clear history. Try again.");
        }
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
                        onRefresh={syncHistory}
                    />
                    <SettingsDialog onSettingsChange={setSmtpSettings} currentSettings={smtpSettings} />
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                        <AuthDialog />
                    </div>
                </div>
            </div>

            {/* Form */}
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    onKeyDown={(e) => {
                        // Prevent Enter key from submitting the form when focused on an input field
                        // This prevents accidental sends when pasting into Subject or Name, 
                        // or if the browser's autofill triggers an Enter event.
                        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                            e.preventDefault();
                        }
                    }}
                    className="space-y-6"
                >
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
                        onValidationChange={setIsValidating}
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

                    {/* Campaign Mode Section */}
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-white dark:text-black" />
                                </div>
                                <div>
                                    <Label htmlFor="bg-mode" className="font-semibold cursor-pointer">Campaign</Label>
                                    <p className="text-xs text-neutral-500">
                                        {isBackgroundForced
                                            ? "Required for more than 10 recipients"
                                            : "Automated background delivery on schedule"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Switch
                                    id="bg-mode"
                                    checked={useBackground}
                                    onCheckedChange={setUseBackground}
                                    disabled={isBackgroundForced}
                                />
                                {isBackgroundForced && (
                                    <span className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter">Required</span>
                                )}
                            </div>
                        </div>


                        {useBackground && (
                            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-4">
                                {/* Info Box */}
                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex gap-2">
                                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed space-y-1">
                                        <p>
                                            <strong>Campaigns run in the background</strong>, even when your browser or device is off.
                                            An external service sends emails on schedule with <strong>small delays</strong> (5-minute cron interval for cost optimization).
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1 font-medium">
                                            <Mail className="h-3.5 w-3.5" />
                                            <span>Optimal interval: 6 minutes</span>
                                        </div>
                                    </div>
                                </div>

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

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="immediate-mode" className="text-sm font-medium">Start Immediately</Label>
                                        <Switch
                                            id="immediate-mode"
                                            checked={startImmediately}
                                            onCheckedChange={setStartImmediately}
                                        />
                                    </div>

                                    {!startImmediately && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="start-time" className="text-sm font-medium">Start Time</Label>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-muted-foreground">Auto-rounded to 5-min intervals</p>
                                                    {startTime && (
                                                        <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                                            Optimal: {format(new Date(startTime), "HH:mm")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <Input
                                                id="start-time"
                                                type="datetime-local"
                                                className="h-10"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                min={new Date().toISOString().slice(0, 16)}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Interval Selector */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Email Interval</Label>
                                    <select
                                        value={intervalMinutes}
                                        onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
                                        className="w-full h-10 px-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
                                    >
                                        <option value={2}>2 Minutes</option>
                                        <option value={5}>5 Minutes</option>
                                        <option value={6}>6 Minutes (Optimal)</option>
                                        <option value={10}>10 Minutes</option>
                                        <option value={15}>15 Minutes</option>
                                        <option value={30}>30 Minutes</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground">
                                        Time between individual emails (6 min = best cost/speed ratio)
                                    </p>
                                </div>

                                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
                                        <p className="text-sm font-semibold">Zeitplan</p>
                                        <p className="text-xs font-mono">{recipients.length} Empfänger</p>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Intervall:</span>
                                            <span className="font-mono">{intervalMinutes} Min/E-Mail</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Start:</span>
                                            <span className="font-mono">
                                                {startTime ? format(new Date(startTime), "HH:mm") : "Sofort"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">End approx.:</span>
                                        <span className="font-mono">
                                            {recipients.length > 1
                                                ? format(new Date((startTime ? new Date(startTime).getTime() : Date.now()) + durationMinutes * 60000), "HH:mm")
                                                : (startTime ? format(new Date(startTime), "HH:mm") : "Immediate")}
                                        </span>
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
                            disabled={isSending || isValidating || recipients.length === 0}
                            size="lg"
                            className="flex-1 h-14 text-lg font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100 shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            title={isValidating ? "Checking recipients for duplicates..." : ""}
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {useBackground ? "Creating Campaign..." : "Sending Emails..."}
                                </>
                            ) : isValidating ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin text-neutral-400" />
                                    Validating Recipient List...
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
