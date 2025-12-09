"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { parseRecipients, RecipientStatus } from "@/lib/recipient-utils"
import { X, Check, AlertTriangle, UserPlus } from "lucide-react"

interface RecipientInputProps {
    onRecipientsChange: (recipients: { email: string; id: string }[]) => void;
    disabled?: boolean;
}

export function RecipientInput({ onRecipientsChange, disabled }: RecipientInputProps) {
    const [rawInput, setRawInput] = useState("")
    const [parsedRecipients, setParsedRecipients] = useState<RecipientStatus[]>([])

    const handleParse = () => {
        const results = parseRecipients(rawInput);
        setParsedRecipients(results);
        // Only pass valid recipients to the parent form
        onRecipientsChange(results.filter(r => r.valid).map(r => ({ email: r.email, id: r.id })));
    }

    // Auto-parse on blur
    const handleBlur = () => {
        handleParse();
    }

    const validCount = parsedRecipients.filter(r => r.valid).length;
    const invalidCount = parsedRecipients.filter(r => !r.valid).length;

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Empfänger (Liste)
                </label>
                <Textarea
                    placeholder={"max@mustermann.de\nerika@musterfrau.de\n..."}
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    onBlur={handleBlur}
                    disabled={disabled}
                    className="min-h-[100px] font-mono text-sm"
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Tipp: Klicken Sie außerhalb des Feldes, um die Adressen zu überprüfen.</span>
                    <Button type="button" variant="outline" size="sm" onClick={handleParse} disabled={disabled}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Adressen analysieren
                    </Button>
                </div>
            </div>

            {parsedRecipients.length > 0 && (
                <Card className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex gap-4 text-sm font-medium">
                            <span className="text-green-600 dark:text-green-500 flex items-center gap-1"><Check className="h-4 w-4" /> {validCount} Gültig</span>
                            {invalidCount > 0 && <span className="text-red-600 dark:text-red-500 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {invalidCount} Ungültig</span>}
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                            {parsedRecipients.map((recipient) => (
                                <Badge
                                    key={recipient.id}
                                    variant={recipient.valid ? "default" : "destructive"}
                                    className="flex items-center gap-1 px-3 py-1"
                                >
                                    {recipient.email}
                                    {recipient.valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
