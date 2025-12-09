"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { emailFormSchema, EmailFormValues, SendResult } from "@/lib/schemas"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RecipientInput } from "@/components/recipient-input"
import { StatusView } from "@/components/status-view"
import { HistoryList, HistoryBatch } from "@/components/history-list"
import { SettingsDialog } from "@/components/settings-dialog"
import { SmtpConfig } from "@/lib/mail"
import { Send, Loader2, Clock } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function EmailForm() {
    const [isSending, setIsSending] = useState(false)
    const [sendProgress, setSendProgress] = useState(0)
    const [currentResults, setCurrentResults] = useState<SendResult[]>([])
    const [history, setHistory] = useState<HistoryBatch[]>([])
    const [smtpSettings, setSmtpSettings] = useState<SmtpConfig | undefined>(undefined)
    const [durationMinutes, setDurationMinutes] = useState(0)
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

    // Watch recipients to validate form state if needed, though zod handles it
    const recipients = form.watch("recipients");

    async function onSubmit(data: EmailFormValues) {
        if (!smtpSettings) {
            toast.error("Bitte konfigurieren Sie zuerst die SMTP-Einstellungen (Zahnrad-Symbol).");
            return;
        }

        setIsSending(true);
        setSendProgress(0);
        setCurrentResults([]);

        // Inject settings into data
        const payload = { ...data, smtpSettings, durationMinutes };

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
                // Clean reset
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

    // Helper to sync RecipientInput with RHF
    const handleRecipientsChange = (newRecipients: { email: string; id: string }[]) => {
        form.setValue("recipients", newRecipients, { shouldValidate: true });
    }

    return (
        <div className="space-y-8">
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Neue Nachricht verfassen</CardTitle>
                            <CardDescription>Senden Sie E-Mails an mehrere Empfänger nacheinander (sequentiell).</CardDescription>
                        </div>
                        <SettingsDialog onSettingsChange={setSmtpSettings} currentSettings={smtpSettings} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Betreff</FormLabel>
                                        <FormControl>
                                            <Input placeholder="z.B. Einladung zum Sommerfest 2024" {...field} disabled={isSending} />
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
                                        <FormLabel>Nachricht</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Geben Sie hier Ihre Nachricht ein..."
                                                className="min-h-[200px]"
                                                {...field}
                                                disabled={isSending}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center justify-between pt-4 border-t dark:border-neutral-800">
                                <div className="flex items-center space-x-2">
                                    <Switch id="bg-mode" checked={useBackground} onCheckedChange={setUseBackground} />
                                    <Label htmlFor="bg-mode">Hintergrund-Versand (Offline)</Label>
                                </div>
                                {useBackground && (
                                    <div className="flex items-center space-x-2">
                                        <Label>Dauer (Minuten):</Label>
                                        <Input
                                            type="number"
                                            className="w-24"
                                            value={durationMinutes}
                                            onChange={e => setDurationMinutes(parseInt(e.target.value) || 0)}
                                            min={0}
                                        />
                                        <span className="text-sm text-neutral-500">
                                            ({(durationMinutes / 60).toFixed(1)} Std)
                                        </span>
                                    </div>
                                )}

                                <Button type="submit" disabled={isSending || recipients.length === 0} size="lg">
                                    {isSending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {useBackground ? "Plane..." : "Sende..."}
                                        </>
                                    ) : (
                                        <>
                                            {useBackground ? <Clock className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                                            {useBackground ? "Kampagne Starten" : "E-Mails versenden"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Status & History View */}
            {(isSending || currentResults.length > 0) && (
                <StatusView
                    isSending={isSending}
                    progress={sendProgress}
                    results={currentResults}
                />
            )}

            {/* History List */}
            <HistoryList batches={history} />
        </div>
    )
}
