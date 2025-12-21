"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseRecipients, RecipientStatus } from "@/lib/recipient-utils"
import { X, Check, AlertTriangle, UserPlus, Trash2, ChevronDown, ChevronUp, Loader2, Sparkles, ShieldCheck } from "lucide-react"
import { isGenericDomain } from "@/lib/domains"
import { cn } from "@/lib/utils"

type ExtendedRecipientStatus = RecipientStatus & { duplicate?: boolean; reason?: string; whitelisted?: boolean };

const WHITELIST_KEY = 'ionos-mailer-email-whitelist';

// Load whitelist from localStorage
const loadWhitelist = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
        const saved = localStorage.getItem(WHITELIST_KEY);
        return new Set(saved ? JSON.parse(saved) : []);
    } catch {
        return new Set();
    }
};

// Save whitelist to localStorage
const saveWhitelist = (whitelist: Set<string>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WHITELIST_KEY, JSON.stringify([...whitelist]));
};

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
    const [parsedRecipients, setParsedRecipients] = useState<ExtendedRecipientStatus[]>([])
    const [activeTab, setActiveTab] = useState("valid")
    const [isChecking, setIsChecking] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [whitelist, setWhitelist] = useState<Set<string>>(new Set())

    // Load whitelist on mount
    useEffect(() => {
        setWhitelist(loadWhitelist());
    }, []);

    // Helper: Whitelist an email permanently
    const handleWhitelist = (email: string) => {
        const normalizedEmail = email.toLowerCase();
        const newWhitelist = new Set(whitelist);
        newWhitelist.add(normalizedEmail);
        setWhitelist(newWhitelist);
        saveWhitelist(newWhitelist);

        // Update parsed recipients to mark as whitelisted
        const updated = parsedRecipients.map(r => {
            if (r.email.toLowerCase() === normalizedEmail) {
                return { ...r, duplicate: false, whitelisted: true, reason: undefined };
            }
            return r;
        });
        setParsedRecipients(updated);
        onRecipientsChange(updated.filter(r => r.valid && !r.duplicate).map(r => ({ email: r.email, id: r.id })));

        toast.success(`${email} whitelisted permanently`, {
            description: "This address will never be flagged as duplicate again."
        });
    };

    // Helper: Check duplicates (excludes whitelisted emails)
    const processDuplicates = async (recipients: RecipientStatus[]): Promise<ExtendedRecipientStatus[]> => {
        // Delay showing loading spinner to prevent flicker for fast operations
        const loadingTimer = setTimeout(() => setIsChecking(true), 500);

        try {
            const emailList = recipients.map(r => r.email);
            if (emailList.length === 0) {
                clearTimeout(loadingTimer);
                setIsChecking(false);
                return recipients;
            }

            const res = await fetch('/api/check-duplicates', {
                method: 'POST',
                body: JSON.stringify({ recipients: emailList })
            });
            const data = await res.json();
            const duplicates = new Set(data.duplicates || []);
            const currentWhitelist = loadWhitelist(); // Fresh load

            return recipients.map((r) => {
                const email = r.email;
                const normalizedEmail = email.toLowerCase();

                // Skip whitelist check - these are permanently allowed
                if (currentWhitelist.has(normalizedEmail)) {
                    return { ...r, valid: true, duplicate: false, whitelisted: true };
                }

                if (duplicates.has(email) || duplicates.has(normalizedEmail)) {
                    return { ...r, valid: true, duplicate: true, reason: "Already contacted in previous campaign" };
                }
                return r;
            });
        } catch (e) {
            console.error("Duplicate check error", e);
            return recipients;
        } finally {
            clearTimeout(loadingTimer);
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

        // OPTIMISTIC UPDATE: Show valid emails instantly (assume no duplicates)
        // This makes the UI feel "ultra fast" as requested
        const optimistic = results.map(r => ({ ...r, valid: r.valid, duplicate: false }));
        setParsedRecipients(optimistic);
        onRecipientsChange(optimistic.filter(r => r.valid).map(r => ({ email: r.email, id: r.id })));

        // Check for duplicates in background
        const processed = await processDuplicates(results);
        setParsedRecipients(processed);

        // Notify user if duplicates were found
        const duplicateCount = processed.filter(r => r.duplicate).length;
        if (duplicateCount > 0) {
            toast.warning(`Found ${duplicateCount} duplicate recipient${duplicateCount === 1 ? '' : 's'}`, {
                description: "Addresses marked in red were found in previous campaigns."
            });
        }

        // Final confirmed update (excludes duplicates)
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
                <div className="flex justify-between items-center h-5">
                    <span className="text-xs flex items-center gap-2">
                        {isChecking ? (
                            <span className="flex items-center gap-2 text-black dark:text-white animate-in fade-in duration-300">
                                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                                <span className="font-medium tracking-wide">Analyzing recipients...</span>
                            </span>
                        ) : (
                            <span className="text-muted-foreground">
                                Tip: Addresses are automatically analyzed when leaving the field
                            </span>
                        )}
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
                                <div className={`flex flex-wrap gap-2 transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-full' : 'max-h-[140px] overflow-hidden'}`}>
                                    {displayList.map((recipient) => {
                                        const isGeneric = isGenericDomain(recipient.email);
                                        const isDuplicate = recipient.duplicate;
                                        const isWhitelisted = recipient.whitelisted;

                                        return (
                                            <Badge
                                                key={recipient.id}
                                                variant={isDuplicate ? "destructive" : "secondary"}
                                                className={cn(
                                                    "flex items-center gap-1 px-3 py-1.5 border transition-all",
                                                    isDuplicate
                                                        ? "opacity-90 bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                                        : isWhitelisted
                                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                                            : isGeneric
                                                                ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                                                                : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                                                )}
                                                title={isDuplicate ? recipient.reason : (isWhitelisted ? "Whitelisted - Always allowed" : (isGeneric ? "Generic Address: Automatic 'XXX' replacement not possible" : "Valid Business Address"))}
                                            >
                                                {isWhitelisted && <ShieldCheck className="h-3 w-3 mr-1" />}
                                                {isDuplicate && <span className="sr-only">Duplicate: </span>}
                                                {isGeneric && !isDuplicate && !isWhitelisted && <AlertTriangle className="h-3 w-3 mr-1" />}

                                                <span className={cn(isDuplicate && "line-through decoration-red-700/50 dark:decoration-red-400/50")}>
                                                    {recipient.email}
                                                </span>

                                                {/* Allow button for duplicates */}
                                                {isDuplicate && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleWhitelist(recipient.email);
                                                        }}
                                                        className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-white/50 hover:bg-white text-green-700 border border-green-300 transition-colors"
                                                        title="Allow permanently - never flag as duplicate again"
                                                    >
                                                        Allow
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(recipient.id)}
                                                    className={`ml-1 rounded-full p-0.5 transition-colors ${isDuplicate
                                                        ? "hover:bg-red-300 dark:hover:bg-red-700"
                                                        : isWhitelisted
                                                            ? "hover:bg-blue-200 dark:hover:bg-blue-800"
                                                            : isGeneric
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
                                {displayList.length > 20 && (
                                    <div className="flex justify-center mt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsExpanded(!isExpanded)}
                                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 h-6"
                                        >
                                            {isExpanded ? (
                                                <>Collapse <ChevronUp className="h-3 w-3" /></>
                                            ) : (
                                                <>Show {displayList.length - 20} more <ChevronDown className="h-3 w-3" /></>
                                            )}
                                        </Button>
                                    </div>
                                )}
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
