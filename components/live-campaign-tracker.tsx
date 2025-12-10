"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Activity, CheckCircle, XCircle, Clock, Mail,
    RefreshCw, Zap, Trash2
} from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

interface EmailJob {
    id: string
    recipient: string
    subject: string
    status: "PENDING" | "SENT" | "FAILED"
    scheduledFor: string
    sentAt: string | null
    error: string | null
    openedAt: string | null
}

interface Campaign {
    id: string
    createdAt: string
    jobs: EmailJob[]
    stats: {
        total: number
        sent: number
        pending: number
        failed: number
        opened: number
        clicked: number
    }
}

export function LiveCampaignTracker() {
    const [open, setOpen] = useState(false)
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(false)
    const [isAutoProcessing, setIsAutoProcessing] = useState(false)

    // FETCH CAMPAIGNS
    const fetchCampaigns = useCallback(async () => {
        setLoading(true)
        try {
            const userId = localStorage.getItem("ionos-mailer-user-id");
            const res = await fetch("/api/campaigns/status", {
                headers: { 'x-user-id': userId || '' }
            })
            if (res.ok) {
                const data = await res.json()
                // Sort by date ascending (oldest first -> #1)
                data.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                setCampaigns(data)
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    // ROBUST AUTO-POLLING & PROCESSING (Frontend "Cron")
    useEffect(() => {
        if (!open) return;

        // 1. Refresh Data Interval
        const refreshInterval = setInterval(fetchCampaigns, 3000); // Fast UI updates

        // 2. Auto-Process trigger (Acts as a backup cron while UI is open)
        const processInterval = setInterval(() => {
            const hasPending = campaigns.some(c => c.stats.pending > 0);
            if (hasPending) {
                setIsAutoProcessing(true);
                fetch('/api/cron/process', {
                    method: 'GET',
                    headers: { 'x-manual-trigger': 'true' }
                }).catch(e => console.error("Auto-process failed", e))
                    .finally(() => {
                        setTimeout(() => setIsAutoProcessing(false), 2000);
                    });
            }
        }, 10000); // Trigger every 10s if pending (augmenting the 10s backend limit)

        return () => {
            clearInterval(refreshInterval);
            clearInterval(processInterval);
        }
    }, [open, fetchCampaigns, campaigns]);
    // Dependency on campaigns ensures we only trigger if we KNOW there are pending items

    useEffect(() => {
        if (open) fetchCampaigns();
    }, [open, fetchCampaigns]);


    const deleteCampaign = async (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (!confirm("Kampagne wirklich löschen? Der Versand wird sofort gestoppt.")) return;

        try {
            // Optimistic update to remove from UI immediately (stops user from clicking again)
            // and gives immediate feedback "it stopped".
            setCampaigns(prev => prev.filter(c => c.id !== id));

            const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
            if (!res.ok) {
                // formatting error or revert if failed
                console.error("Deletion failed on server");
                // In a real app we might revert, but for now we assume success or refresh will fix
                fetchCampaigns();
            }
        } catch (e) { console.error(e); }
    }

    const activeCampaigns = campaigns.filter(c => c.stats.pending > 0)
    const completedCampaigns = campaigns.filter(c => c.stats.pending === 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                    <Activity className="h-4 w-4" />
                    Live-Tracking
                    {activeCampaigns.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-black dark:bg-white rounded-full animate-pulse" />
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="w-[95vw] max-w-[1400px] h-[90vh] flex flex-col p-0 overflow-hidden bg-neutral-50 dark:bg-black rounded-xl border-0 shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                            <Activity className="h-5 w-5 text-white dark:text-black" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Live Kampagnen-Tracking</h2>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    {isAutoProcessing ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                            <RefreshCw className="h-3 w-3 animate-spin" /> Verarbeite Hintergrund-Jobs...
                                        </span>
                                    ) : (
                                        <span>System bereit • Letzte Aktualisierung: {format(new Date(), "HH:mm:ss")}</span>
                                    )}
                                </p>
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {campaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Mail className="h-12 w-12 opacity-20 mb-4" />
                            <p>Keine Kampagnen aktiv</p>
                        </div>
                    ) : (
                        <div className="space-y-8 max-w-5xl mx-auto">

                            {/* ACTIVE */}
                            {activeCampaigns.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                        Laufend ({activeCampaigns.length})
                                    </h3>
                                    <AnimatePresence>
                                        {activeCampaigns.map(c => (
                                            <MinimalCampaignRow
                                                key={c.id}
                                                campaign={c}
                                                index={campaigns.findIndex(ca => ca.id === c.id) + 1}
                                                onDelete={(e) => deleteCampaign(c.id, e)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </section>
                            )}

                            {/* COMPLETED */}
                            {completedCampaigns.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        Abgeschlossen ({completedCampaigns.length})
                                    </h3>
                                    <div className="opacity-60 hover:opacity-100 transition-opacity">
                                        {completedCampaigns.map(c => (
                                            <MinimalCampaignRow
                                                key={c.id}
                                                campaign={c}
                                                index={campaigns.findIndex(ca => ca.id === c.id) + 1}
                                                onDelete={(e) => deleteCampaign(c.id, e)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function MinimalCampaignRow({ campaign, index, onDelete }: { campaign: Campaign, index: number, onDelete: (e: React.MouseEvent) => void }) {
    const progress = campaign.stats.total > 0
        ? ((campaign.stats.sent + campaign.stats.failed) / campaign.stats.total) * 100
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm"
        >
            {/* Campaign Header */}
            <div className="bg-neutral-50/50 dark:bg-neutral-900/50 p-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-mono text-xs font-bold">
                        #{index}
                    </div>
                    <div>
                        <div className="text-sm font-medium">Kampagne vom {format(new Date(campaign.createdAt), "dd.MM.yyyy")}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{progress.toFixed(0)}% Fertig</span>
                            <span className="h-1 w-1 bg-neutral-300 rounded-full" />
                            <span>{campaign.stats.sent} Gesendet</span>
                            <span className="h-1 w-1 bg-neutral-300 rounded-full" />
                            <span className="text-green-600">{campaign.stats.opened} Geöffnet</span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Email List - Minimalist Table */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {campaign.jobs.map((job) => (
                    <div key={job.id} className="p-3 px-4 flex items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-sm">

                        {/* Recipient - Smaller text */}
                        <div className="flex-[2] min-w-0 pr-4">
                            <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 break-all">{job.recipient}</div>
                            {job.openedAt && <div className="text-[10px] text-blue-500 font-medium mt-0.5">Gelesen um {format(new Date(job.openedAt), "HH:mm")}</div>}
                        </div>

                        {/* Times */}
                        <div className="flex items-center gap-6 text-xs text-muted-foreground flex-shrink-0">
                            <div className="text-right w-24">
                                <div className="uppercase text-[10px] tracking-wider opacity-50">Geplant</div>
                                <div>{format(new Date(job.scheduledFor), "HH:mm:ss")}</div>
                            </div>

                            <div className="text-right w-24">
                                <div className="uppercase text-[10px] tracking-wider opacity-50">Gesendet</div>
                                <div className={`${!job.sentAt ? 'text-neutral-300' : ''}`}>
                                    {job.sentAt ? format(new Date(job.sentAt), "HH:mm:ss") : "--:--:--"}
                                </div>
                            </div>

                            {/* Status Pill - Small */}
                            <div className="w-20 flex justify-end">
                                <Badge
                                    className={`
                                        h-5 px-2 text-[10px] border-0 font-bold tracking-wide
                                        ${job.status === 'SENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500 hover:bg-green-100' :
                                            job.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500 hover:bg-red-100' :
                                                'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-100'}
                                    `}
                                >
                                    {job.status === 'SENT' ? 'GESENDET' :
                                        job.status === 'FAILED' ? 'FEHLER' :
                                            'WARTEND'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    )
}
