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
import { cn } from "@/lib/utils"

type ExtendedRecipientStatus = RecipientStatus & { duplicate?: boolean; reason?: string };


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
    const [parsedRecipients, setParsedRecipients] = useState<(RecipientStatus & { duplicate?: boolean })[]>([])
    const [activeTab, setActiveTab] = useState("valid")
    const [isChecking, setIsChecking] = useState(false)

    // Helper: Check duplicates
    const processDuplicates = async (recipients: RecipientStatus[]): Promise<ExtendedRecipientStatus[]> => {
        setIsChecking(true);
        try {
            const emailList = recipients.map(r => r.email);
            if (emailList.length === 0) return recipients;

            const res = await fetch('/api/check-duplicates', {
                method: 'POST',
                body: JSON.stringify({ recipients: emailList })
            });
            const data = await res.json();
            const duplicates = new Set(data.duplicates || []);

            return recipients.map((r) => {
                const email = r.email;
                if (duplicates.has(email) || duplicates.has(email.toLowerCase())) {
                    return { ...r, valid: true, duplicate: true, reason: "Duplicate: Already sent in previous campaign" };
                    // Ensure 'valid: true' so they appear in valid tab (but crossed out)
                    // Wait, if valid: true, they are in onRecipientsChange?
                    // I filter them out of onRecipientsChange explicitly.
                }
                return r;
            });
        } catch (e) {
            console.error("Duplicate check error", e);
            return recipients;
        } finally {
            setIsChecking(false);
        }
    };

    // Sync external recipients from parent (e.g., when loading draft)
    // Sync external recipients from parent (e.g., when loading draft)
    useEffect(() => {
        if (externalRecipients && externalRecipients.length > 0) {
            // Convert external recipients to our internal format
            const emails = externalRecipients.map(r => r.email);
            setRawInput(emails.join('\n'));

            // Create parsed recipients with valid status
            const parsed = externalRecipients.map(r => ({
                email: r.email,
                id: r.id || crypto.randomUUID(),
                valid: true, // Assume valid since they were already parsed before
                reason: undefined
            }));

            // Check duplicates for loaded drafts too!
            processDuplicates(parsed).then(processed => {
                setParsedRecipients(processed);
                // Even though they come from draft, if they ARE duplicates now, we exclude them from "sending" list initially?
                // Or do we trust the draft? User said "warn... if he adds".
                // Safest is to check and warn.
                onRecipientsChange(processed.filter(r => r.valid && !r.duplicate).map(r => ({ email: r.email, id: r.id })));
            });
        }
    }, [externalRecipients]);

    const handleParse = async () => {
        const results = parseRecipients(rawInput);
        const processed = await processDuplicates(results);
        setParsedRecipients(processed);
        onRecipientsChange(processed.filter(r => r.valid && !r.duplicate).map(r => ({ email: r.email, id: r.id })));
    }

    const handleRemove = (id: string) => {
        const updated = parsedRecipients.filter(r => r.id !== id);
        setParsedRecipients(updated);
        onRecipientsChange(updated.filter(r => r.valid && !r.duplicate).map(r => ({ email: r.email, id: r.id })));
        // Also update raw input
        setRawInput(updated.map(r => r.email).join('\n'));
    }

    const handleClearAll = () => {
        setParsedRecipients([]);
        onRecipientsChange([]);
        setRawInput("");
    }

    const validEmails = parsedRecipients.filter(r => r.valid && !r.duplicate);
    const duplicateEmails = parsedRecipients.filter(r => r.duplicate);
    // Invalid are those that are NOT valid AND not duplicates (duplicates are handled separately)
    // Wait, if I set valid: true for dupes, then invalid filter is just !valid.
    // If I set valid: false for dupes, invalid filter is !valid && !duplicate.
    // In previous block I set valid: true for dupes? 
    // "Ensure 'valid: true' so they appear in valid tab"
    // So dupes are valid=true, duplicate=true.
    // Then invalidEmails = !valid. Correct.
    const invalidEmails = parsedRecipients.filter(r => !r.valid);

    // Combine for display in "Valid" tab (Duplicates shown scratched)
    const displayList = [...validEmails, ...duplicateEmails];

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Recipients (List)</label>
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
                        Tip: Addresses are automatically analyzed when leaving the field
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
                                        Valid ({validEmails.length})
                                        {duplicateEmails.length > 0 && (
                                            <span className="ml-1 text-xs text-red-500 font-semibold line-through decoration-red-500/50 opacity-80 decoration-2 animate-in fade-in slide-in-from-left-1">
                                                +{duplicateEmails.length}
                                            </span>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="invalid" className="gap-2" disabled={invalidEmails.length === 0}>
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        Invalid ({invalidEmails.length})
                                    </TabsTrigger>
                                </TabsList>
                                <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-red-500 hover:text-red-600">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Clear all
                                </Button>
                            </div>

                            <TabsContent value="valid" className="mt-4">
                                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                                    {displayList.map((recipient) => {
                                        const isGeneric = isGenericDomain(recipient.email);
                                        const isDuplicate = recipient.duplicate;

                                        return (
                                            <Badge
                                                key={recipient.id}
                                                variant={isDuplicate ? "destructive" : "secondary"}
                                                className={cn(
                                                    "flex items-center gap-1 px-3 py-1.5 border transition-all",
                                                    isDuplicate
                                                        ? "line-through opacity-70 bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                                        : isGeneric
                                                            ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                                                            : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                                                )}
                                                title={isDuplicate ? recipient.reason : (isGeneric ? "Generic Address: Automatic 'XXX' replacement not possible" : "Valid Business Address")}
                                            >
                                                {isDuplicate && <span className="sr-only">Duplicate: </span>}
                                                {isGeneric && !isDuplicate && <AlertTriangle className="h-3 w-3 mr-1" />}
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
                                        <p className="text-sm text-muted-foreground">No valid email addresses</p>
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
