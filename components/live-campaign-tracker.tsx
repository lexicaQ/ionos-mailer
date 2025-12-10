"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Activity, CheckCircle, XCircle, Clock, Mail,
    RefreshCw, Zap, Send, ChevronDown, ChevronUp, FileText
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"

interface EmailJob {
    id: string
    recipient: string
    subject: string
    body?: string
    status: "PENDING" | "SENT" | "FAILED"
    scheduledFor: string
    sentAt: string | null
    error: string | null
    openedAt: string | null
    openCount: number
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
    // Auto-refresh always on
    const autoRefresh = true

    const fetchCampaigns = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/campaigns/status")
            if (res.ok) {
                const data = await res.json()
                setCampaigns(data)
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (open) {
            fetchCampaigns()
        }
    }, [open, fetchCampaigns])

    useEffect(() => {
        if (open && autoRefresh) {
            const interval = setInterval(fetchCampaigns, 5000) // 5s interval for live feeling
            return () => clearInterval(interval)
        }
    }, [open, autoRefresh, fetchCampaigns])

    const activeCampaigns = campaigns.filter(c => c.stats.pending > 0)
    const completedCampaigns = campaigns.filter(c => c.stats.pending === 0)

    const totalStats = campaigns.reduce(
        (acc, c) => ({
            total: acc.total + c.stats.total,
            sent: acc.sent + c.stats.sent,
            pending: acc.pending + c.stats.pending,
            failed: acc.failed + c.stats.failed,
            opened: acc.opened + c.stats.opened,
        }),
        { total: 0, sent: 0, pending: 0, failed: 0, opened: 0 }
    )

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
            <DialogContent className="max-w-[100vw] w-screen h-[100vh] flex flex-col p-0 overflow-hidden bg-neutral-50 dark:bg-black rounded-none border-0 pt-0">
                <DialogHeader className="p-6 pb-4 border-b bg-white dark:bg-neutral-900 shadow-sm z-10">
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-black dark:bg-white flex items-center justify-center shrink-0 relative shadow-md">
                                <Activity className="h-6 w-6 text-white dark:text-black" />
                                {activeCampaigns.length > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-black">
                                        <span className="text-[10px] text-white font-bold">{activeCampaigns.length}</span>
                                    </span>
                                )}
                            </div>
                            <div>
                                <span className="text-2xl font-bold tracking-tight">Live Kampagnen-Tracking</span>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                    <Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-800 border-0">{totalStats.sent} Gesendet</Badge>
                                    <Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-800 border-0">{totalStats.pending} Ausstehend</Badge>
                                    <Badge variant="outline" className="bg-neutral-100 dark:bg-neutral-800 border-0">{totalStats.failed} Fehler</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="gap-2 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black">
                                <Zap className="h-3 w-3 animate-pulse text-yellow-500" />
                                Live-Update Aktiv
                            </Badge>
                            <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading} className="w-10 px-0">
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-neutral-50 dark:bg-black">
                    {campaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-in fade-in-50">
                            <div className="h-24 w-24 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-6">
                                <Mail className="h-10 w-10 opacity-20" />
                            </div>
                            <p className="text-xl font-bold text-neutral-900 dark:text-white">Keine Kampagnen vorhanden</p>
                            <p className="text-sm mt-2 max-w-sm text-center">Starte eine neue Kampagne im Hintergrund-Modus, um den Live-Fortschritt hier zu verfolgen.</p>
                        </div>
                    ) : (
                        <div className="max-w-[1800px] mx-auto space-y-10">
                            {/* Active Campaigns */}
                            {activeCampaigns.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                        <h3 className="text-lg font-bold tracking-tight">Aktive Kampagnen</h3>
                                        <Badge variant="secondary" className="ml-auto">{activeCampaigns.length}</Badge>
                                    </div>

                                    <AnimatePresence>
                                        {activeCampaigns.map((campaign) => (
                                            <CampaignCard key={campaign.id} campaign={campaign} isActive />
                                        ))}
                                    </AnimatePresence>
                                </section>
                            )}

                            {/* Completed Campaigns */}
                            {completedCampaigns.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                                        <CheckCircle className="h-4 w-4 text-neutral-400" />
                                        <h3 className="text-lg font-bold tracking-tight text-muted-foreground">Abgeschlossen</h3>
                                        <Badge variant="secondary" className="ml-auto">{completedCampaigns.length}</Badge>
                                    </div>

                                    <AnimatePresence>
                                        {completedCampaigns.map((campaign) => (
                                            <CampaignCard key={campaign.id} campaign={campaign} isActive={false} />
                                        ))}
                                    </AnimatePresence>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function CampaignCard({ campaign, isActive }: { campaign: Campaign; isActive: boolean }) {
    const [expanded, setExpanded] = useState(isActive)
    const progress = campaign.stats.total > 0
        ? ((campaign.stats.sent + campaign.stats.failed) / campaign.stats.total) * 100
        : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <Card className={`overflow-hidden transition-all duration-300 ${isActive ? "shadow-lg border-black/10 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5" : "hover:shadow-md border-neutral-200 dark:border-neutral-800"}`}>
                <div
                    className={`p-6 cursor-pointer ${isActive ? "bg-white dark:bg-neutral-900" : "bg-neutral-50/50 dark:bg-neutral-900/50"}`}
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        {/* Left Info */}
                        <div className="flex items-start gap-4 flex-1">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isActive ? "bg-black text-white dark:bg-white dark:text-black" : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800"}`}>
                                {isActive ? <Send className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold tracking-tight">
                                    Kampagne {format(new Date(campaign.createdAt), "dd.MM", { locale: de })}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 rounded text-xs py-0.5">#{campaign.id.substring(0, 6)}</span>
                                    <span>•</span>
                                    <span>{format(new Date(campaign.createdAt), "HH:mm 'Uhr'", { locale: de })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Middle Stats & Progress */}
                        <div className="flex-1 space-y-3 min-w-[300px]">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{progress.toFixed(0)}% Abgeschlossen</span>
                                <span className="text-muted-foreground">{campaign.stats.sent + campaign.stats.failed} / {campaign.stats.total}</span>
                            </div>
                            <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-black dark:bg-white relative overflow-hidden"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                >
                                    {isActive && (
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-black/30 to-transparent"
                                            animate={{ x: ["-100%", "100%"] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        />
                                    )}
                                </motion.div>
                            </div>
                        </div>

                        {/* Right Toggle */}
                        <div className="hidden lg:flex items-center justify-end flex-shrink-0 w-[100px]">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    <AnimatePresence>
                                        {campaign.jobs.map((job, index) => (
                                            <EmailCard key={job.id} job={job} index={index} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    )
}

function EmailCard({ job, index }: { job: EmailJob; index: number }) {
    const [flipped, setFlipped] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="h-full"
        >
            <div
                className={`relative group h-full rounded-xl border-2 transition-all duration-300 hover:shadow-lg flex flex-col ${job.status === "SENT"
                        ? "border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                        : job.status === "FAILED"
                            ? "border-red-100 bg-red-50/10 dark:border-red-900/30 dark:bg-red-900/10"
                            : "border-amber-100 bg-amber-50/10 dark:border-amber-900/30 dark:bg-amber-900/10"
                    }`}
            >
                {/* Status Indicator Bar */}
                <div className={`h-1.5 w-full absolute top-0 left-0 right-0 rounded-t-sm ${job.status === "SENT" ? "bg-green-500"
                        : job.status === "FAILED" ? "bg-red-500"
                            : "bg-amber-500 animate-pulse"
                    }`} />

                <div className="p-5 pt-7 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${job.status === "SENT" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
                                : job.status === "FAILED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500"
                            }`}>
                            {job.status === "SENT" ? <CheckCircle className="h-5 w-5" />
                                : job.status === "FAILED" ? <XCircle className="h-5 w-5" />
                                    : <Clock className="h-5 w-5 animate-pulse" />}
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px] opacity-50">
                            {format(new Date(job.scheduledFor), "HH:mm")}
                        </Badge>
                    </div>

                    {/* Content */}
                    <div className="mt-auto">
                        <p className="text-sm font-semibold truncate mb-1" title={job.recipient}>{job.recipient}</p>
                        <p className="text-xs text-muted-foreground truncate mb-3" title={job.subject}>{job.subject}</p>

                        {job.error && (
                            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3 truncate">
                                {job.error}
                            </p>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                            <span className={`text-xs font-bold uppercase tracking-wider ${job.status === "SENT" ? "text-green-600"
                                    : job.status === "FAILED" ? "text-red-600"
                                        : "text-amber-600"
                                }`}>
                                {job.status === "SENT" ? "Gesendet" : job.status === "FAILED" ? "Fehlgeschlagen" : "Wartend"}
                            </span>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                                onClick={() => setFlipped(!flipped)}
                            >
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Flipped Detail View Overlay */}
                <AnimatePresence>
                    {flipped && (
                        <motion.div
                            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
                            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            className="absolute inset-0 bg-white/95 dark:bg-black/90 z-10 flex flex-col p-5 rounded-xl"
                        >
                            <div className="flex items-center justify-between mb-4 border-b pb-2">
                                <span className="text-xs font-bold uppercase text-muted-foreground">Details</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 rounded-full"
                                    onClick={() => setFlipped(false)}
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-3 overflow-y-auto text-xs">
                                <div>
                                    <p className="font-semibold mb-1">Betreff:</p>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{job.subject}</p>
                                </div>
                                {job.openedAt && (
                                    <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                        <p className="font-semibold text-blue-600 dark:text-blue-400">Gelesen</p>
                                        <p className="text-blue-600 dark:text-blue-400">{format(new Date(job.openedAt), "HH:mm:ss")}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold mb-1">Nachricht:</p>
                                    <p className="text-muted-foreground line-clamp-3 italic">{job.body || "Kein Inhalt verfügbar"}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                                    <div>
                                        <p className="font-semibold text-[10px] uppercase text-muted-foreground">Geplant</p>
                                        <p>{format(new Date(job.scheduledFor), "HH:mm:ss")}</p>
                                    </div>
                                    {job.sentAt && (
                                        <div>
                                            <p className="font-semibold text-[10px] uppercase text-muted-foreground">Gesendet</p>
                                            <p>{format(new Date(job.sentAt), "HH:mm:ss")}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
