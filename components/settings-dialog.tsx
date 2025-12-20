"use client"

import { useState, useEffect } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ResponsiveModal } from "@/components/responsive-modal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SmtpConfig } from "@/lib/mail"
import { Settings, Save, RotateCcw, Eye, EyeOff, Zap, CheckCircle, XCircle, RefreshCw, Trash2, Cloud, Check } from "lucide-react"
import { toast } from "sonner"




interface SettingsDialogProps {
    onSettingsChange: (settings: SmtpConfig) => void;
    currentSettings?: SmtpConfig;
}

export function SettingsDialog({ onSettingsChange, currentSettings }: SettingsDialogProps) {
    const { data: session } = useSession()
    const [open, setOpen] = useState(false)
    const [host, setHost] = useState("smtp.ionos.de")
    const [port, setPort] = useState("587")
    const [user, setUser] = useState("")
    const [pass, setPass] = useState("")
    const [delay, setDelay] = useState(500)
    const [showPassword, setShowPassword] = useState(false)
    const [savePassword, setSavePassword] = useState(true)
    const [fromName, setFromName] = useState("")
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [testing, setTesting] = useState(false)
    const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [hasLoaded, setHasLoaded] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            let loadedFromCloud = false;

            // Helper to detect if a password looks encrypted (contains IV separator)
            const looksEncrypted = (pass: string) => pass && pass.includes(':') && pass.length > 50;

            // 1. Try Cloud Sync
            if (session?.user) {
                try {
                    const res = await fetch('/api/sync/settings');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.settings) {
                            const s = data.settings;
                            setHost(s.host || "smtp.ionos.de");
                            setPort(String(s.port || "587"));
                            setUser(s.user || "");
                            setPass(s.pass || "");
                            setDelay(s.delay || 500);
                            setFromName(s.fromName || "");

                            // Sync down to local (with decrypted password)
                            localStorage.setItem("smtp-config-full", JSON.stringify(s));

                            if (s.user && s.pass) {
                                onSettingsChange({ ...s, secure: Number(s.port) === 465 });
                            }
                            loadedFromCloud = true;
                        }
                    }
                } catch (e) {
                    console.error("Cloud sync check failed", e);
                }
            }

            if (typeof window !== 'undefined' && localStorage) {
                const saved = localStorage.getItem("smtp-config-full");
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);

                        // CLEAR stale encrypted passwords from localStorage
                        if (looksEncrypted(parsed.pass)) {
                            console.log("Detected encrypted password in localStorage, clearing...");
                            localStorage.removeItem("smtp-config-full");
                            // Don't load this corrupted data
                        } else if (!loadedFromCloud) {
                            setHost(parsed.host || "smtp.ionos.de");
                            setPort(parsed.port || "587");
                            setUser(parsed.user || "");
                            setPass(parsed.pass || "");
                            setDelay(parsed.delay || 500);
                            setFromName(parsed.fromName || "");
                            setSavePassword(parsed.savePassword !== false);

                            if (parsed.pass && parsed.user) {
                                onSettingsChange({
                                    host: parsed.host || "smtp.ionos.de",
                                    port: parseInt(parsed.port) || 587,
                                    user: parsed.user,
                                    pass: parsed.pass,
                                    secure: parseInt(parsed.port) === 465,
                                    delay: parsed.delay || 500,
                                    fromName: parsed.fromName,
                                });
                            }
                        }
                    } catch (e) { console.error(e) }
                }
            }
            setHasLoaded(true);
        };

        loadSettings();
    }, [session]);

    // Auto-Save Effect
    useEffect(() => {
        if (!hasLoaded) return; // Don't save empty states while loading

        const timer = setTimeout(async () => {
            setSyncStatus('saving');

            const config: SmtpConfig = {
                host,
                port: parseInt(port) || 587,
                user,
                pass,
                secure: parseInt(port) === 465,
                delay,
                fromName,
            };

            // 1. Propagate to parent
            onSettingsChange(config);

            // 2. Save Local
            const dataToSave = savePassword
                ? { host, port, user, pass, delay, fromName, savePassword }
                : { host, port, user, delay, fromName, savePassword };

            localStorage.setItem("smtp-config-full", JSON.stringify(dataToSave));

            // 3. Save Cloud
            if (session?.user) {
                try {
                    await fetch('/api/sync/settings', {
                        method: 'POST',
                        body: JSON.stringify({ ...dataToSave, port: parseInt(port) })
                    });
                    setSyncStatus('saved');
                } catch (e) {
                    console.error("Cloud save failed", e);
                    setSyncStatus('error');
                }
            } else {
                setSyncStatus('saved');
            }
        }, 800); // 800ms debounce

        return () => clearTimeout(timer);
    }, [host, port, user, pass, delay, fromName, savePassword, hasLoaded, session]);



    const triggerButton = (
        <Button variant="outline" size="icon" title="SMTP Settings">
            <Settings className="h-4 w-4" />
        </Button>
    )

    const headerActions = null // Removed


    const syncIndicator = (
        <span className="text-[10px] text-muted-foreground mr-8 italic">
            Everything is saved automatically
        </span>
    )

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={setOpen}
            trigger={triggerButton}
            title="SMTP Settings"
            description="Configure your IONOS credentials"
            className="sm:max-w-[650px] flex flex-col max-h-[85vh] my-auto"
            headerActions={syncIndicator}
        >
            <ScrollArea className="flex-1 h-full max-h-[60vh] md:max-h-[70vh] pr-4 overflow-y-auto">

                <div className="grid gap-6 pt-4 pb-4">


                    {/* Server Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Server</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <Label htmlFor="host" className="text-xs mb-2 block">Host</Label>
                                <Input id="host" value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.ionos.de" />
                            </div>
                            <div>
                                <Label htmlFor="port" className="text-xs mb-2 block">Port</Label>
                                <Input id="port" value={port} onChange={e => setPort(e.target.value)} autoComplete="off" />
                            </div>
                        </div>
                    </div>

                    {/* Authentication */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Authentication</h4>
                        <div>
                            <Label htmlFor="user" className="text-xs mb-2 block">Email / User</Label>
                            <Input id="user" value={user} onChange={e => setUser(e.target.value)} placeholder="email@ionos.com" autoComplete="off" />
                        </div>
                        <div>
                            <Label htmlFor="pass" className="text-xs mb-2 block">Password</Label>
                            <div className="relative">
                                <Input
                                    id="pass"
                                    type={showPassword ? "text" : "password"}
                                    value={pass}
                                    onChange={e => setPass(e.target.value)}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <Label htmlFor="save-pass" className="text-sm font-medium">Save Password</Label>
                                <p className="text-xs text-muted-foreground">Save in browser cache</p>
                            </div>
                            <Switch id="save-pass" checked={savePassword} onCheckedChange={setSavePassword} />
                        </div>
                    </div>

                    {/* Sending Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Sending</h4>
                        <div>
                            <Label htmlFor="fromName" className="text-xs mb-2 block">Sender Name (optional)</Label>
                            <Input id="fromName" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="My Company" autoComplete="off" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <Label className="text-xs">Delay between emails</Label>
                                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{(delay / 1000).toFixed(1)}s</span>
                            </div>
                            <Slider
                                value={[delay]}
                                max={10000}
                                min={0}
                                step={100}
                                onValueChange={(vals) => setDelay(vals[0])}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Recommended: 0.5-2s to avoid rate limits</p>
                        </div>
                    </div>
                </div>

                {/* Sync Indicator */}


                {/* Debug / Test */}
                <div className="space-y-4 pt-1">
                    <h4 className="text-sm font-medium text-muted-foreground">Diagnosis & Test</h4>

                    {/* Status Message Display */}
                    {statusMsg && (
                        <div className={`p-3 rounded-md text-xs font-medium flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                            'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                            {statusMsg.type === 'success' ? <CheckCircle className="h-3 w-3 flex-shrink-0" /> : <XCircle className="h-3 w-3 flex-shrink-0" />}
                            <span className="break-all">{statusMsg.text}</span>
                        </div>
                    )}

                    {/* Connection Test */}
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            <p>Test SMTP Connection</p>
                            <p>(Checks password and server)</p>
                        </div>
                        <Button variant="outline" size="sm" disabled={testing} onClick={async () => {
                            setTesting(true);
                            setStatusMsg(null);
                            try {
                                const res = await fetch("/api/test-connection", {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ host, port, user, pass, secure: parseInt(port) === 465 })
                                });
                                const data = await res.json();
                                if (data.success) {
                                    setStatusMsg({ type: 'success', text: "Connection successful!" });
                                } else {
                                    setStatusMsg({ type: 'error', text: data.error + (data.details ? ` (${JSON.stringify(data.details)})` : "") });
                                }
                            } catch (e: any) {
                                setStatusMsg({ type: 'error', text: "Network error: " + e.message });
                            } finally {
                                setTesting(false);
                            }
                        }}>
                            {testing ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <Zap className="h-3 w-3 mr-2 text-amber-500" />}
                            Test Connection
                        </Button>
                    </div>

                    <div className="flex items-center justify-between pb-4">
                        <div className="text-xs text-muted-foreground">
                            <p>Manual Cron Start</p>
                            <p>(Processes pending emails)</p>
                        </div>
                        <Button variant="outline" size="sm" disabled={testing} onClick={async () => {
                            setTesting(true);
                            setStatusMsg(null);
                            try {
                                const res = await fetch("/api/cron/process", {
                                    headers: { 'x-manual-trigger': 'true' }
                                });
                                const data = await res.json();
                                if (res.ok) {
                                    const processed = data.processed ?? 0;
                                    const futureCount = data.futurePendingCount ?? 0;
                                    const failed = data.failed ?? 0;

                                    if (processed === 0 && futureCount === 0) {
                                        setStatusMsg({ type: 'success', text: `✓ Queue empty – no pending emails to process.` });
                                    } else if (processed === 0 && futureCount > 0) {
                                        setStatusMsg({ type: 'success', text: `✓ No emails due now. ${futureCount} email${futureCount !== 1 ? 's' : ''} scheduled for later delivery.` });
                                    } else if (processed > 0 && failed === 0) {
                                        setStatusMsg({ type: 'success', text: `✓ Successfully sent ${processed} email${processed !== 1 ? 's' : ''}!${futureCount > 0 ? ` ${futureCount} more scheduled for later.` : ' Queue complete.'}` });
                                    } else if (processed > 0 && failed > 0) {
                                        setStatusMsg({ type: 'error', text: `Sent ${processed}, failed ${failed}.${futureCount > 0 ? ` ${futureCount} more scheduled.` : ''}` });
                                    } else {
                                        setStatusMsg({ type: 'success', text: `✓ Processing complete. ${futureCount > 0 ? `${futureCount} emails scheduled.` : 'Queue empty.'}` });
                                    }
                                } else {
                                    setStatusMsg({ type: 'error', text: "Error: " + data.error });
                                }
                            } catch (e: any) {
                                setStatusMsg({ type: 'error', text: "Connection error: " + e.message });
                            } finally {
                                setTesting(false);
                            }
                        }}>
                            {testing ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-2" />}
                            Start Cron
                        </Button>
                    </div>
                </div>

                {/* Data Management */}
                <div className="space-y-4 pt-2 mt-4 pb-6">
                    <h4 className="text-sm font-medium text-muted-foreground">Data Management</h4>
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            <p>Reset App</p>
                            <p>(Deletes history & settings)</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => {
                            if (confirm("Do you really want to delete all local data (history, settings)?")) {
                                localStorage.removeItem("ionos-mailer-history");
                                localStorage.removeItem("smtp-config-full");
                                window.location.reload();
                            }
                        }}>
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete All Data
                        </Button>
                    </div>
                </div>
            </ScrollArea>


        </ResponsiveModal >
    )
}
