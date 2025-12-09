"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { emailFormSchema, EmailFormValues, SendResult } from "@/lib/schemas"
import { StatusView } from "@/components/status-view"
import { RecipientInput } from "@/components/recipient-input"
import { HistoryModal, HistoryBatch } from "@/components/history-modal"
import { CampaignTracker } from "@/components/campaign-tracker"
import { SettingsDialog } from "@/components/settings-dialog"
import { SmtpConfig } from "@/lib/mail"
import { Send, Loader2, Clock, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

export function EmailForm() {
    const [isSending, setIsSending] = useState(false)
    const [sendProgress, setSendProgress] = useState(0)
    const [currentResults, setCurrentResults] = useState<SendResult[]>([])
    const [history, setHistory] = useState<HistoryBatch[]>([])
    const [smtpSettings, setSmtpSettings] = useState<SmtpConfig | undefined>(undefined)
    const [durationMinutes, setDurationMinutes] = useState(60)
    const [useBackground, setUseBackground] = useState(false)

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: {
            subject: "",
            body: "",
            recipients: [],
            smtpSettings: undefined
        }
    })

    const recipients = form.watch("recipients");

    async function onSubmit(data: EmailFormValues) {
        if (!smtpSettings) {
            toast.error("Bitte konfigurieren Sie zuerst die SMTP-Einstellungen (Zahnrad-Symbol).");
            return;
        }

        setIsSending(true);
        setSendProgress(0);
        setCurrentResults([]);

        const payload = { ...data, smtpSettings, durationMinutes: useBackground ? durationMinutes : 0 };

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
    }

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

    return (
        <div className="p-6 md:p-8 space-y-8">
            {/* Header Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-lg">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg">Neue Nachricht</h2>
                        <p className="text-sm text-slate-500">E-Mails an mehrere Empfänger versenden</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <CampaignTracker />
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
                    />
                    {form.formState.errors.recipients && (
                        <p className="text-sm font-medium text-destructive">
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
                                    <Textarea
                                        placeholder="Geben Sie hier Ihre Nachricht ein..."
                                        className="min-h-[200px] text-base leading-relaxed"
                                        {...field}
                                        disabled={isSending}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Background Mode Section */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br black dark:white flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <Label htmlFor="bg-mode" className="font-semibold cursor-pointer">Hintergrund-Versand</Label>
                                    <p className="text-xs text-slate-500">E-Mails werden über Zeit verteilt gesendet</p>
                                </div>
                            </div>
                            <Switch id="bg-mode" checked={useBackground} onCheckedChange={setUseBackground} />
                        </div>

                        {useBackground && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label className="text-sm font-medium">Verteilungsdauer</Label>
                                        <span className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1 rounded-lg shadow-sm">
                                            {durationMinutes >= 60 
                                                ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`
                                                : `${durationMinutes} min`
                                            }
                                        </span>
                                    </div>
                                    <Slider
                                        value={[durationMinutes]}
                                        onValueChange={(v) => setDurationMinutes(v[0])}
                                        min={10}
                                        max={1440}
                                        step={10}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                                        <span>10 min</span>
                                        <span>24 Stunden</span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                        💡 Die E-Mails werden gleichmäßig über {durationMinutes >= 60 
                                            ? `${Math.floor(durationMinutes / 60)} Stunden` 
                                            : `${durationMinutes} Minuten`
                                        } verteilt. Du kannst den Browser schließen.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <Button 
                        type="submit" 
                        disabled={isSending || recipients.length === 0} 
                        size="lg"
                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r black dark:white hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25"
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
        </div>
    )
}
