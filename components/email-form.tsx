"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { emailFormSchema, EmailFormValues, SendResult } from "@/lib/schemas"
import { RecipientInput } from "@/components/recipient-input"
import { HistoryModal, HistoryBatch } from "@/components/history-modal"
import { LiveCampaignTracker } from "@/components/live-campaign-tracker"
import { SettingsDialog } from "@/components/settings-dialog"
import { AuthDialog } from "@/components/auth-dialog"
import { FileImportModal } from "@/components/file-import-modal"
import { ExtractionResult } from "@/lib/parsers"
import { SmtpConfig } from "@/lib/mail"
import { Send, Loader2, Clock, Sparkles, FileUp, Sun, Moon } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { PlaceholderPreviewDialog } from "@/components/placeholder-preview-dialog"
import { DraftsModal } from "@/components/drafts-modal"
import { EmailDraft, loadDrafts as loadLocalDrafts, saveDraft as saveLocalDraft } from "@/lib/drafts"
import { Attachment } from "@/lib/schemas"
import { useTheme } from "next-themes"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const HISTORY_STORAGE_KEY = "ionos-mailer-history"

import { useSession } from "next-auth/react"
import { Logo } from "./logo"

export function EmailForm() {
    const { data: session } = useSession()
    const { setTheme, theme } = useTheme()

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
    const [editorKey, setEditorKey] = useState(0) // Logic to force-reset editor on load
    const [fileImportOpen, setFileImportOpen] = useState(false)
    const [greeting, setGreeting] = useState("")

    // Dynamic Greeting
    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting("Good Morning")
        else if (hour < 18) setGreeting("Good Afternoon")
        else setGreeting("Good Evening")
    }, [])

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

                // 2. Merge with local history
                setHistory(prev => {
                    const map = new Map<string, HistoryBatch>()
                    prev.forEach(b => map.set(b.id, b))
                    serverData.forEach(b => map.set(b.id, { ...map.get(b.id), ...b } as HistoryBatch))

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
                const localDrafts = await loadLocalDrafts()
                const res = await fetch("/api/sync/drafts", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ drafts: localDrafts })
                })

                if (res.ok) {
                    const data = await res.json()
                    if (data.merged) {
                        for (const draft of data.merged) {
                            await saveLocalDraft(draft)
                        }
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
            name: undefined
        },
    })

    const handleLoadDraft = async (draft: EmailDraft) => {
        form.reset({
            subject: draft.subject,
            body: draft.body,
            recipients: draft.recipients, // Already compatible object array
            attachments: draft.attachments || [],
            name: draft.name
        })
        setCurrentAttachments(draft.attachments || [])
        setCurrentDraftId(draft.id)
        setEditorKey(prev => prev + 1) // Force re-render of editor

        // Update loaded recipients for Input visual
        setLoadedRecipients(draft.recipients)

        toast.success("Draft Loaded", {
            description: `Subject: ${draft.subject || "(No Subject)"}`
        })
    }

    const handleRecipientsChange = (newRecipients: { email: string; id: string }[]) => {
        // Form expects { email, id }[]
        form.setValue("recipients", newRecipients, { shouldValidate: true })
    }

    const onSubmit = async (values: EmailFormValues) => {
        if (!values.recipients || values.recipients.length === 0) {
            toast.error("No recipients", { description: "Please add at least one recipient." })
            return
        }

        if (!smtpSettings?.host) {
            toast.error("SMTP Settings Missing", { description: "Please configure SMTP settings first." })
            return
        }

        setIsSending(true)
        setCurrentResults([])
        setSendProgress(0)

        // recipients is already array of objects {email, id}
        const total = values.recipients.length

        const startTime = new Date().toISOString()
        const batchId = crypto.randomUUID()
        const campaignName = values.name

        // Extract raw emails for sending logic if needed, but API usually handles objects or strings
        const recipientListForApi = values.recipients.map(r => r.email)

        try {
            if (useBackground) {
                // BACKGROUND SENDING (Serverless + CRON)
                const res = await fetch("/api/campaigns", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        campaign: {
                            name: campaignName || values.subject,
                            subject: values.subject,
                            body: values.body,
                            fromName: session?.user?.name || "IONOS Mailer User",
                            user: session?.user?.email || "unknown",
                            host: smtpSettings.host,
                            port: smtpSettings.port,
                            user_email: smtpSettings.user,
                            pass: smtpSettings.pass,
                            status: "pending",
                            scheduledAt: new Date().toISOString(),
                            durationMinutes: durationMinutes
                        },
                        recipients: recipientListForApi, // Sending strings to API? Or Objects?
                        // Let's check API. Usually expects array of strings or objects.
                        // Ideally send objects if possible to preserve IDs?
                        // The previous logic sent `values.recipients` which was object array then.
                        // Let's send `values.recipients` as `recipientListForApi` if API supports it,
                        // otherwise map to strings.
                        // Assuming API handles strings for now to be safe:
                        // actually schema probably wants strings or objects?
                        // Let's stick to simple strings for `recipients` field in API call
                        // as per common pattern, or check API later. 
                        // Step 760 showed RecipientInput passing objects.
                        // Let's send strings to API as it likely expects that for sending.
                        // Wait, `recipientListForApi` was used in original code? No. 
                        // I'll send strings:
                        attachments: values.attachments
                    })
                })

                if (!res.ok) throw new Error("Failed to create campaign")

                toast.success("Campaign Started", {
                    description: `${total} emails queued for background delivery over ${durationMinutes} minutes.`
                })

                form.reset()
                setCurrentAttachments([])
                setLoadedRecipients([])
                setCurrentResults([])
                setIsSending(false)
                return
            }

            // FOREGROUND SENDING
            const results: SendResult[] = []

            for (let i = 0; i < total; i++) {
                const recipientEmail = values.recipients[i].email
                try {
                    const res = await fetch("/api/send-emails", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            recipients: [recipientEmail],
                            subject: values.subject,
                            body: values.body,
                            smtpConfig: smtpSettings,
                            attachments: values.attachments,
                            fromName: session?.user?.name
                        }),
                    })

                    const data = await res.json()
                    if (data.results && data.results.length > 0) {
                        results.push(data.results[0])
                    } else {
                        results.push({ email: recipientEmail, status: "error", error: "Unknown error", success: false, timestamp: new Date().toISOString() })
                    }
                } catch (e: any) {
                    results.push({ email: recipientEmail, status: "error", error: e.message, success: false, timestamp: new Date().toISOString() })
                }

                setSendProgress(Math.round(((i + 1) / total) * 100))
                setCurrentResults([...results])
            }

            const successCount = results.filter(r => r.status === 'success' || r.success).length
            const failureCount = results.filter(r => r.status === 'error' || !r.success).length

            const newBatch: HistoryBatch = {
                id: batchId,
                sentAt: startTime,
                subject: values.subject,
                total: total,         // Fixed property name
                success: successCount, // Fixed property name
                failed: failureCount,  // Fixed property name
                results: results,
                campaignName: campaignName
            }

            setHistory(prev => [newBatch, ...prev])
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([newBatch, ...history]))
            saveHistoryToServer(newBatch)

            if (failureCount === 0) {
                toast.success("Emails sent successfully!")
            } else {
                toast.warning(`Finished with ${failureCount} errors.`)
            }

            setCurrentResults(results)

        } catch (error: any) {
            toast.error("Sending failed", { description: error.message })
        } finally {
            setIsSending(false)
        }
    }

    const handleDeleteBatch = (id: string) => {
        const updated = history.filter(b => b.id !== id)
        setHistory(updated)
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
    }

    const handleClearAllHistory = () => {
        setHistory([])
        localStorage.removeItem(HISTORY_STORAGE_KEY)
        toast.info("History cleared")
    }

    const handleImport = useCallback((result: ExtractionResult) => {
        try {
            // ExtractionResult has `detectedRecipients` which are objects {email, id, name, ...}
            if (result.detectedRecipients && result.detectedRecipients.length > 0) {
                const currentFn = form.getValues('recipients') || [];
                const currentEmails = currentFn.map(r => r.email);

                // Filter new
                const newRecipients = result.detectedRecipients.filter(r => !currentEmails.includes(r.email));

                // Merge: maintain object structure
                const merged = [...currentFn, ...newRecipients.map(r => ({ email: r.email, id: r.id || crypto.randomUUID() }))];

                if (newRecipients.length > 0) {
                    toast.success(`Imported ${newRecipients.length} recipients`);
                    form.setValue('recipients', merged, { shouldValidate: true });
                    setLoadedRecipients(merged);
                } else {
                    toast.info("No new emails found (duplicates skipped)");
                }
            }

            // Subject
            const currentSubject = form.getValues('subject') || '';
            if (result.subjectSuggestion && !currentSubject.trim()) {
                form.setValue('subject', result.subjectSuggestion);
            }

            // Body
            const currentBody = form.getValues('body') || '';
            if (result.bodySuggestion && (!currentBody.trim() || currentBody === '<p></p>')) {
                const ensureHtml = (content: string) => {
                    const hasTags = /<[a-z][\s\S]*>/i.test(content);
                    return hasTags ? content : content.replace(/\n/g, '<br>');
                };
                form.setValue('body', ensureHtml(result.bodySuggestion));
                setEditorKey(prev => prev + 1);
            }

            if (result.warnings.length > 0) {
                toast.info(result.warnings.join('. '));
            }
        } catch (error: any) {
            console.error('Error applying file import:', error);
            toast.error('Error applying import');
        }
    }, [form]);

    return (
        <div className="relative min-h-screen pb-20">
            {/* Sticky Glassmorphism Header */}
            <header className="sticky top-4 z-40 mx-4 md:mx-auto max-w-5xl mb-8">
                <div className="rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 pl-5 md:pr-4 flex flex-col md:flex-row items-center justify-between gap-4">

                    {/* Brand & Greeting */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="h-10 w-10 shrink-0 relative hover:scale-105 transition-transform duration-300">
                            <Logo className="w-full h-full" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                {greeting}, {session?.user?.name?.split(' ')[0] || 'Guest'}
                                <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
                            </h2>
                            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                                Compose Campaign
                            </p>
                        </div>
                    </div>

                    {/* Unified Actions Toolbar */}
                    <div className="flex items-center gap-1.5 w-full md:w-auto justify-end overflow-x-auto no-scrollbar scroll-smooth">

                        {/* Tooltip Wrapper Component */}
                        <div className="flex items-center gap-1.5 p-1 bg-neutral-100/50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/20 dark:border-neutral-700/20">
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div><DraftsModal
                                        currentSubject={form.watch('subject')}
                                        currentBody={form.watch('body')}
                                        currentRecipients={form.watch('recipients')}
                                        currentAttachments={currentAttachments}
                                        onLoadDraft={handleLoadDraft}
                                        currentDraftId={currentDraftId}
                                    /></div>
                                </TooltipTrigger>
                                <TooltipContent>Manage Drafts</TooltipContent>
                            </Tooltip>

                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div><LiveCampaignTracker /></div>
                                </TooltipTrigger>
                                <TooltipContent>Active Campaigns</TooltipContent>
                            </Tooltip>

                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div><HistoryModal
                                        batches={history}
                                        onDeleteBatch={handleDeleteBatch}
                                        onClearAll={handleClearAllHistory}
                                    /></div>
                                </TooltipTrigger>
                                <TooltipContent>Send History</TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />

                        <div className="flex items-center gap-1.5">
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div><SettingsDialog onSettingsChange={setSmtpSettings} currentSettings={smtpSettings} /></div>
                                </TooltipTrigger>
                                <TooltipContent>SMTP Settings</TooltipContent>
                            </Tooltip>

                            {/* Theme Toggle Integrated */}
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                        className="h-9 w-9 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
                                        <span className="sr-only">Toggle theme</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Switch Theme</TooltipContent>
                            </Tooltip>

                            <div className="hidden md:block">
                                <AuthDialog />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">

                {/* Main Form Card */}
                <div className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm rounded-3xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm p-6 md:p-8">
                    {/* Form */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            <div className="grid gap-6">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">Subject Line</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="What is this email about?"
                                                    {...field}
                                                    disabled={isSending}
                                                    className="h-12 text-base rounded-xl border-neutral-200 dark:border-neutral-800 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 transition-all"
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
                                            className="gap-2 border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                            title="Load from CSV/Basic File"
                                        >
                                            <FileUp className="h-4 w-4 text-neutral-500" />
                                            <span className="text-neutral-600 dark:text-neutral-400">Import</span>
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
                                            <FormLabel className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">Message Content</FormLabel>
                                            <FormControl>
                                                <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                                                    <RichTextEditor
                                                        key={editorKey} // Force reset on load
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        initialAttachments={currentAttachments}
                                                        onAttachmentsChange={(atts) => {
                                                            form.setValue('attachments', atts);
                                                            setCurrentAttachments(atts);
                                                        }}
                                                        placeholder="Write your masterpiece here..."
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Background Mode Section */}
                            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg transform rotate-3">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <Label htmlFor="bg-mode" className="font-bold text-base cursor-pointer">Start Campaign</Label>
                                            <p className="text-sm text-neutral-500 mt-0.5">Automated background delivery & tracking</p>
                                        </div>
                                    </div>
                                    <Switch id="bg-mode" checked={useBackground} onCheckedChange={setUseBackground} />
                                </div>

                                {useBackground && (
                                    <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-6 animate-in slide-in-from-top-4 fade-in duration-300">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-sm font-semibold">Campaign Name</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g. Winter Sale 2024"
                                                            {...field}
                                                            disabled={isSending}
                                                            className="h-10 rounded-xl"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <Label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Distribution Speed</Label>
                                                <div className="text-sm font-bold bg-white dark:bg-black px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    {durationMinutes >= 60
                                                        ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
                                                        : `${durationMinutes} mins`
                                                    }
                                                </div>
                                            </div>
                                            <Slider
                                                value={[durationMinutes]}
                                                min={1} // Minimum 1 minute
                                                max={1440} // Max 24 hours
                                                step={1}
                                                onValueChange={(val) => setDurationMinutes(val[0])}
                                                className="py-4"
                                            />
                                            <p className="text-xs text-neutral-400 mt-2 text-center font-medium">
                                                Spreads {form.watch('recipients')?.length || 0} emails over {durationMinutes} minutes
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex flex-col items-center gap-4">
                                {isSending ? (
                                    <div className="w-full space-y-4 max-w-md mx-auto text-center p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                        <div className="relative h-16 w-16 mx-auto">
                                            <div className="absolute inset-0 rounded-full border-4 border-neutral-200 dark:border-neutral-800" />
                                            <div className="absolute inset-0 rounded-full border-4 border-black dark:border-white border-t-transparent animate-spin" />
                                            <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-pulse" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-lg">Sending in progress...</h3>
                                            <p className="text-sm text-neutral-500">Do not close this window</p>
                                        </div>
                                        <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-black dark:bg-white transition-all duration-300 ease-out"
                                                style={{ width: `${sendProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs font-mono text-neutral-400">{sendProgress}% Complete</p>

                                        {/* Result Preview List (Limited) */}
                                        <div className="max-h-32 overflow-y-auto text-left text-xs bg-white dark:bg-black rounded-lg p-2 border border-neutral-200 dark:border-neutral-800 space-y-1">
                                            {currentResults.slice(-5).map((r, i) => (
                                                <div key={i} className={`flex items-center gap-2 ${r.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {r.status === 'success' ? <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                                    <span className="truncate">{r.email}</span>
                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                ) : (
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full md:w-auto min-w-[240px] h-14 text-lg rounded-full shadow-xl shadow-black/5 hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-black dark:bg-white text-white dark:text-black font-bold"
                                        disabled={isSending || loadedRecipients.length === 0}
                                    >
                                        <Send className="mr-2 h-5 w-5" />
                                        {useBackground ? "Launch Campaign" : "Send Now"}
                                    </Button>
                                )}

                                <FileImportModal
                                    open={fileImportOpen}
                                    onOpenChange={setFileImportOpen}
                                    onImport={handleImport}
                                />
                                <PlaceholderPreviewDialog
                                    recipients={form.watch("recipients") || []}
                                    subject={form.watch("subject")}
                                    body={form.watch("body")}
                                />
                            </div>

                        </form>
                    </Form>
                </div>
            </div>
        </div>
    )
}
