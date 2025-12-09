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
import { SmtpConfig } from "@/lib/mail"
import { Settings } from "lucide-react"

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

    useEffect(() => {
        if (localStorage) {
            const saved = localStorage.getItem("smtp-config-public");
            if (saved) {
                const parsed = JSON.parse(saved);
                setHost(parsed.host || "smtp.ionos.de");
                setPort(parsed.port || "587");
                setUser(parsed.user || "");
                setDelay(parsed.delay || 500);
                // We do NOT save password to localstorage by default for security, 
                // but we will keep it in component state if passed back (though usually we don't pass it back)
            }
        }
    }, [])

    const handleSave = () => {
        const config: SmtpConfig = {
            host,
            port: parseInt(port),
            user,
            pass, // Password is in memory state only
            secure: parseInt(port) === 465,
            delay,
        }

        onSettingsChange(config);

        // Persist non-sensitive data
        localStorage.setItem("smtp-config-public", JSON.stringify({ host, port, user, delay }));

        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="SMTP Einstellungen">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>SMTP Einstellungen</DialogTitle>
                    <DialogDescription>
                        Konfigurieren Sie hier Ihre IONOS-Zugangsdaten. Diese werden sicher an den Server übertragen.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="host" className="text-right">
                            Host
                        </Label>
                        <Input id="host" value={host} onChange={e => setHost(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="port" className="text-right">
                            Port
                        </Label>
                        <Input id="port" value={port} onChange={e => setPort(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="user" className="text-right">
                            Benutzer
                        </Label>
                        <Input id="user" value={user} onChange={e => setUser(e.target.value)} placeholder="email@ionos.de" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="pass" className="text-right">
                            Passwort
                        </Label>
                        <Input id="pass" type="password" value={pass} onChange={e => setPass(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 pt-2">
                        <Label className="text-right">Verzögerung</Label>
                        <div className="col-span-3 flex items-center gap-4">
                            <Slider
                                defaultValue={[delay]}
                                max={10000}
                                step={100}
                                onValueChange={(vals) => setDelay(vals[0])}
                                className="flex-1"
                            />
                            <span className="w-12 text-sm font-mono text-right">{(delay / 1000).toFixed(1)}s</span>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>Speichern</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
