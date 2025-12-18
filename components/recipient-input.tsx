"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseRecipients, RecipientStatus } from "@/lib/recipient-utils"
import { X, Check, AlertTriangle, UserPlus, Trash2 } from "lucide-react"
import { isGenericDomain } from "@/lib/domains"


interface RecipientInputProps {
    onRecipientsChange: (recipients: { email: string; id: string }[]) => void;
    disabled?: boolean;
    // NEW: Allow parent to set recipients (for draft loading)
    externalRecipients?: { email: string; id?: string }[];
    // NEW: Allow injecting custom action button (Import)
    customAction?: React.ReactNode;
}

export function RecipientInput({ onRecipientsChange, disabled, externalRecipients, customAction }: RecipientInputProps) {
    const [rawInput, setRawInput] = useState("")
    const [parsedRecipients, setParsedRecipients] = useState<RecipientStatus[]>([])
    const [activeTab, setActiveTab] = useState("valid")

    // Sync external recipients from parent (e.g., when loading draft)
    useEffect(() => {
        if (externalRecipients && externalRecipients.length > 0) {
            // Convert external recipients to our internal format
            const emails = externalRecipients.map(r => r.email);
            setRawInput(emails.join('\n'));

            // Create parsed recipients with valid status
            const parsed: RecipientStatus[] = externalRecipients.map(r => ({
                email: r.email,
                id: r.id || crypto.randomUUID(),
                valid: true, // Assume valid since they were already parsed before
                reason: undefined
            }));
            setParsedRecipients(parsed);
        }
    }, [externalRecipients]);

    const handleParse = () => {
        const results = parseRecipients(rawInput);
        setParsedRecipients(results);
        onRecipientsChange(results.filter(r => r.valid).map(r => ({ email: r.email, id: r.id })));
    }

    const handleRemove = (id: string) => {
        const updated = parsedRecipients.filter(r => r.id !== id);
        setParsedRecipients(updated);
        onRecipientsChange(updated.filter(r => r.valid).map(r => ({ email: r.email, id: r.id })));
        // Also update raw input
        setRawInput(updated.map(r => r.email).join('\n'));
    }

    const handleClearAll = () => {
        setParsedRecipients([]);
        onRecipientsChange([]);
        setRawInput("");
    }

    const validEmails = parsedRecipients.filter(r => r.valid);
    const invalidEmails = parsedRecipients.filter(r => !r.valid);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Empfänger (Liste)</label>
                <Textarea
                    placeholder={"max@mustermann.de\nerika@musterfrau.de\n..."}
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    onBlur={handleParse}
                    disabled={disabled}
                    className="min-h-[100px] font-mono text-sm"
                />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                        Tipp: Adressen werden automatisch beim Verlassen des Feldes analysiert
                    </span>
                    <div className="flex items-center gap-2">
                        {customAction}
                    </div>
                </div>
            </div>

            {parsedRecipients.length > 0 && (
                <Card className="border-neutral-200 dark:border-neutral-800">
                    <CardContent className="p-4 space-y-3">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <div className="flex items-center justify-between">
                                <TabsList className="grid w-fit grid-cols-2">
                                    <TabsTrigger value="valid" className="gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Gültig ({validEmails.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="invalid" className="gap-2" disabled={invalidEmails.length === 0}>
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        Ungültig ({invalidEmails.length})
                                    </TabsTrigger>
                                </TabsList>
                                <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-red-500 hover:text-red-600">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Alle löschen
                                </Button>
                            </div>

                            <TabsContent value="valid" className="mt-4">
                                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                                    {validEmails.map((recipient) => {
                                        const isGeneric = isGenericDomain(recipient.email);
                                        return (
                                            <Badge
                                                key={recipient.id}
                                                variant="secondary"
                                                className={`flex items-center gap-1 px-3 py-1.5 border transition-colors ${isGeneric
                                                    ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                                                    : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                                                    }`}
                                                title={isGeneric ? "Generische Adresse: Automatische 'XXX' Ersetzung nicht möglich" : "Gültige Firmen-Adresse"}
                                            >
                                                {isGeneric && <AlertTriangle className="h-3 w-3 mr-1" />}
                                                {recipient.email}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(recipient.id)}
                                                    className={`ml-1 rounded-full p-0.5 transition-colors ${isGeneric
                                                        ? "hover:bg-orange-200 dark:hover:bg-orange-800"
                                                        : "hover:bg-green-200 dark:hover:bg-green-800"
                                                        }`}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        );
                                    })}
                                    {validEmails.length === 0 && (
                                        <p className="text-sm text-muted-foreground">Keine gültigen E-Mail-Adressen</p>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="invalid" className="mt-4">
                                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                                    {invalidEmails.map((recipient) => (
                                        <Badge
                                            key={recipient.id}
                                            variant="destructive"
                                            className="flex items-center gap-1 px-3 py-1.5"
                                        >
                                            {recipient.email}
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(recipient.id)}
                                                className="ml-1 hover:bg-red-700 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
