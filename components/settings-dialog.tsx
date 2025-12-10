"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { SmtpConfig } from "@/lib/mail"
import { Settings, Save, RotateCcw, Eye, EyeOff, Zap, CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface SettingsDialogProps {
    onSettingsChange: (settings: SmtpConfig) => void;
    currentSettings?: SmtpConfig;
}

export function SettingsDialog({ onSettingsChange, currentSettings }: SettingsDialogProps) {
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

    useEffect(() => {
        if (typeof window !== 'undefined' && localStorage) {
            const saved = localStorage.getItem("smtp-config-full");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setHost(parsed.host || "smtp.ionos.de");
                    setPort(parsed.port || "587");
                    setUser(parsed.user || "");
                    setPass(parsed.pass || "");
                    setDelay(parsed.delay || 500);
                    setFromName(parsed.fromName || "");
                    setSavePassword(parsed.savePassword !== false);

                    // Auto-apply settings if password exists
                    if (parsed.pass && parsed.user) {
                        const config: SmtpConfig = {
                            host: parsed.host || "smtp.ionos.de",
                            port: parseInt(parsed.port) || 587,
                            user: parsed.user,
                            pass: parsed.pass,
                            secure: parseInt(parsed.port) === 465,
                            delay: parsed.delay || 500,
                        };
                        onSettingsChange(config);
                    }
                } catch (e) {
                    console.error("Failed to parse saved settings", e);
                }
            }
        }
    }, [])

    const handleSave = () => {
        const config: SmtpConfig = {
            host,
            port: parseInt(port),
            user,
            pass,
            secure: parseInt(port) === 465,
            delay,
        }

        onSettingsChange(config);

        // Save all settings including password if user opted in
        const dataToSave = savePassword
            ? { host, port, user, pass, delay, fromName, savePassword }
            : { host, port, user, delay, fromName, savePassword };

        localStorage.setItem("smtp-config-full", JSON.stringify(dataToSave));
        setOpen(false)
    }

    const handleReset = () => {
        setHost("smtp.ionos.de");
        setPort("587");
        setUser("");
        setPass("");
        setDelay(500);
        setFromName("");
        localStorage.removeItem("smtp-config-full");
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="SMTP Einstellungen">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        SMTP Einstellungen
                    </DialogTitle>
                    <DialogDescription>
                        Konfigurieren Sie Ihre IONOS-Zugangsdaten. Diese können optional lokal gespeichert werden.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Server Settings */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Server</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <Label htmlFor="host" className="text-xs">Host</Label>
                                <Input id="host" value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.ionos.de" />
                            </div>
                            <div>
                                <Label htmlFor="port" className="text-xs">Port</Label>
                                <Input id="port" value={port} onChange={e => setPort(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Authentication */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Authentifizierung</h4>
                        <div>
                            <Label htmlFor="user" className="text-xs">E-Mail / Benutzer</Label>
                            <Input id="user" value={user} onChange={e => setUser(e.target.value)} placeholder="email@ionos.de" />
                        </div>
                        <div>
                            <Label htmlFor="pass" className="text-xs">Passwort</Label>
                            <div className="relative">
                                <Input
                                    id="pass"
                                    type={showPassword ? "text" : "password"}
                                    value={pass}
                                    onChange={e => setPass(e.target.value)}
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
                                <Label htmlFor="save-pass" className="text-sm font-medium">Passwort speichern</Label>
                                <p className="text-xs text-muted-foreground">Im Browser-Cache speichern</p>
                            </div>
                            <Switch id="save-pass" checked={savePassword} onCheckedChange={setSavePassword} />
                        </div>
                    </div>

                    {/* Sending Settings */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Versand</h4>
                        <div>
                            <Label htmlFor="fromName" className="text-xs">Absender-Name (optional)</Label>
                            <Input id="fromName" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Mein Unternehmen" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs">Verzögerung zwischen E-Mails</Label>
                                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{(delay / 1000).toFixed(1)}s</span>
                            </div>
                            <Slider
                                value={[delay]}
                                max={10000}
                                min={0}
                                step={100}
                                onValueChange={(vals) => setDelay(vals[0])}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Empfohlen: 0.5-2s um Rate-Limits zu vermeiden</p>
                        </div>
                    </div>
                </div>

                {/* Debug / Test */}
                <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground">Diagnose & Test</h4>

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
                            <p>SMTP-Verbindung testen</p>
                            <p>(Prüft Passwort und Server)</p>
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
                                    setStatusMsg({ type: 'success', text: "Verbindung erfolgreich!" });
                                } else {
                                    setStatusMsg({ type: 'error', text: data.error + (data.details ? ` (${JSON.stringify(data.details)})` : "") });
                                }
                            } catch (e: any) {
                                setStatusMsg({ type: 'error', text: "Netzwerkfehler: " + e.message });
                            } finally {
                                setTesting(false);
                            }
                        }}>
                            {testing ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <Zap className="h-3 w-3 mr-2 text-amber-500" />}
                            Verbindung testen
                        </Button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            <p>Cron-Job manuell starten</p>
                            <p>(Verarbeitet wartende E-Mails)</p>
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
                                    setStatusMsg({ type: 'success', text: `Verarbeitet: ${data.processed}. Nächster Job getriggert.` });
                                } else {
                                    setStatusMsg({ type: 'error', text: "Fehler: " + data.error });
                                }
                            } catch (e: any) {
                                setStatusMsg({ type: 'error', text: "Fehler: " + e.message });
                            } finally {
                                setTesting(false);
                            }
                        }}>
                            {testing ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-2" />}
                            Cron starten
                        </Button>
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button variant="ghost" onClick={handleReset} className="text-red-500 hover:text-red-600">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Zurücksetzen
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Speichern
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
