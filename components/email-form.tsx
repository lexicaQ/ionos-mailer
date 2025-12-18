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
import { EmailDraft } from "@/lib/drafts"
import { Attachment } from "@/lib/schemas"

const HISTORY_STORAGE_KEY = "ionos-mailer-history"

export function EmailForm() {
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
            toast.error("Bitte konfigurieren Sie zuerst die SMTP-Einstellungen (Zahnrad-Symbol).");
            return;
        }

        setIsSending(true);
        setSendProgress(0);
        setCurrentResults([]);

        // Get or create pseudo-anonymous User ID for data isolation
        let userId = localStorage.getItem("ionos-mailer-user-id");
        if (!userId) {
            userId = crypto.randomUUID();
            localStorage.setItem("ionos-mailer-user-id", userId);
        }

        const payload = {
            ...data,
            smtpSettings,
            durationMinutes: useBackground ? durationMinutes : 0,
            userId // Send ID for privacy isolation
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
                throw new Error(errorData.error || "Fehler beim Senden");
            }

            const resultData = await response.json();

            if (useBackground) {
                toast.success(`Kampagne gestartet! ${resultData.jobCount} E-Mails geplant.`);
                setCurrentResults([]);
            } else {
                const results: SendResult[] = resultData.results;
                setCurrentResults(results);
                setSendProgress(100);

                const successCount = results.filter(r => r.success).length;
                const newBatch: HistoryBatch = {
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    results: results,
                    total: results.length,
                    success: successCount,
                    failed: results.length - successCount,
                };
                setHistory(prev => [...prev, newBatch]);

                toast.success("Versand abgeschlossen");
            }

        } catch (error: any) {
            toast.error(error.message || "Ein unerwarteter Fehler ist aufgetreten");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    }, [smtpSettings, useBackground, durationMinutes, setIsSending, setSendProgress, setCurrentResults, setHistory])

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
                    e.returnValue = "Der Versand läuft im Hintergrund weiter, aber mit Verzögerung. Möchten Sie wirklich schließen?";
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
        toast.success("Kampagne gelöscht");
    }

    const handleClearAllHistory = () => {
        setHistory([]);
        toast.success("Verlauf gelöscht");
    }

    const handleLoadDraft = useCallback((draft: EmailDraft) => {
        try {
            // console.log('[EmailForm] Loading draft:', draft.name);

            // Sanitization Helper: Fixes "blob:null" errors from old drafts
            const sanitizeContent = (html: string) => {
                if (!html) return "";
                // Replace blob: URLs with placeholder or remove them
                // Also handles the "strip media" requirement for old drafts that might still have them
                let clean = html.replace(/src="blob:[^"]*"/g, 'src="" data-removed="blob-url"');
                // Optional: We can also strip huge base64 strings if we want to enforce text-only strongly
                // clean = clean.replace(/src="data:image\/[^;]+;base64,[^"]*"/g, 'src="" data-removed="base64"');

                // Add visual placeholder for removed images if needed, or just leave broken
                if (clean.includes('data-removed="blob-url"')) {
                    clean = clean.replace(/<img[^>]*data-removed="blob-url"[^>]*>/g, '<span class="text-xs text-muted-foreground italic">[Bild entfernt: Ungültige Quelle]</span>');
                }
                return clean;
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
                toast.success(`Entwurf "${draft.name}" geladen (Ungültige Bilder entfernt)`);
            } else {
                toast.success(`Entwurf "${draft.name}" geladen`);
            }
        } catch (error: any) {
            console.error("Critical error loading draft:", error);
            toast.error("Fehler beim Laden des Entwurfs: " + error.message);
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

                // Merge with existing (avoid duplicates)
                const existingEmails = new Set(currentRecipients.map(r => r.email.toLowerCase()));
                const uniqueNew = newRecipients.filter(r => !existingEmails.has(r.email.toLowerCase()));

                if (uniqueNew.length > 0) {
                    const merged = [...currentRecipients, ...uniqueNew];
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
                form.setValue('body', result.bodySuggestion);
                setEditorKey(prev => prev + 1); // Force editor refresh
            }

            // Show warnings if any
            if (result.warnings.length > 0) {
                toast.info(result.warnings.join('. '));
            }
        } catch (error: any) {
            console.error('Error applying file import:', error);
            toast.error('Fehler beim Anwenden des Imports');
        }
    }, [form]);

    return (
        <div className="p-6 md:p-8 space-y-8">
            {/* Header Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-lg">
                        <Sparkles className="h-5 w-5 text-white dark:text-black" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg">Neue Nachricht</h2>
                        <p className="text-sm text-neutral-500">E-Mails an mehrere Empfänger versenden</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
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
                    <SettingsDialog onSettingsChange={setSmtpSettings} currentSettings={smtpSettings} />
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
                                <FormLabel className="text-sm font-semibold">Betreff</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="z.B. Einladung zum Sommerfest 2024"
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
                                variant="ghost"
                                size="sm"
                                onClick={() => setFileImportOpen(true)}
                                className="gap-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                                title="E-Mail-Adressen aus Datei laden"
                            >
                                <FileUp className="h-4 w-4" />
                                E-Mail-Adressen importieren
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
                                <FormLabel className="text-sm font-semibold">Nachricht</FormLabel>
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
                                        placeholder="Geben Sie hier Ihre Nachricht ein..."
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
                                    <Label htmlFor="bg-mode" className="font-semibold cursor-pointer">Hintergrund-Versand</Label>
                                    <p className="text-xs text-neutral-500">E-Mails werden über Zeit verteilt gesendet</p>
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
                                            <FormLabel className="text-sm font-semibold">Kampagnen-Name (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="z.B. Newsletter Dezember 2024"
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
                                        <Label className="text-sm font-medium">Verteilungsdauer</Label>
                                        <span className="text-sm font-mono bg-white dark:bg-neutral-800 px-3 py-1 rounded-lg shadow-sm">
                                            {durationMinutes >= 60
                                                ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`
                                                : `${durationMinutes} min`
                                            }
                                        </span>
                                    </div>
                                    <Slider
                                        value={[durationMinutes]}
                                        onValueChange={(v) => setDurationMinutes(v[0])}
                                        min={1}
                                        max={1440}
                                        step={1}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-neutral-500 mt-2">
                                        <span>1 min</span>
                                        <span>24 Stunden</span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
                                        <p className="text-sm font-semibold">Versand-Zeitplan</p>
                                        <p className="text-xs font-mono">{recipients.length} Empfänger</p>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Intervall:</span>
                                            <span className="font-mono">
                                                {recipients.length > 1
                                                    ? `Alle ${(durationMinutes / (recipients.length - 1)).toFixed(1)} Minuten`
                                                    : "Sofort"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Start:</span>
                                            <span className="font-mono">Sofort</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Ende ca.:</span>
                                            <span className="font-mono">
                                                {recipients.length > 1
                                                    ? format(new Date(Date.now() + durationMinutes * 60000), "HH:mm") + " Uhr"
                                                    : "Sofort"}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-neutral-200 dark:border-neutral-800">
                                        Der Browser muss nicht geöffnet bleiben. Der Server übernimmt den Versand.
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
                                    {useBackground ? "Kampagne wird erstellt..." : "E-Mails werden gesendet..."}
                                </>
                            ) : (
                                <>
                                    {useBackground ? <Clock className="mr-2 h-5 w-5" /> : <Send className="mr-2 h-5 w-5" />}
                                    {useBackground ? "Kampagne starten" : `${recipients.length} E-Mail${recipients.length !== 1 ? 's' : ''} versenden`}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Status View */}
            {(isSending || currentResults.length > 0) && (
                <StatusView
                    isSending={isSending}
                    progress={sendProgress}
                    results={currentResults}
                />
            )}

            {/* File Import Modal */}
            <FileImportModal
                open={fileImportOpen}
                onOpenChange={setFileImportOpen}
                onImport={handleFileImport}
            />
        </div>
    )
}
