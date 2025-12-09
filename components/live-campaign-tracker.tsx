"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Activity, CheckCircle, XCircle, Clock, Mail,
    RefreshCw, Zap, Send, Eye, ChevronDown, ChevronUp, FileText
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
    const [autoRefresh, setAutoRefresh] = useState(true)

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
            const interval = setInterval(fetchCampaigns, 10000)
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
            <DialogContent className="w-[99vw] max-w-[1900px] h-[98vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-black dark:bg-white flex items-center justify-center shrink-0 relative">
                                <Activity className="h-7 w-7 text-white dark:text-black" />
                                {activeCampaigns.length > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-neutral-600 rounded-full flex items-center justify-center">
                                        <span className="text-xs text-white font-bold">{activeCampaigns.length}</span>
                                    </span>
                                )}
                            </div>
                            <div>
                                <span className="text-3xl font-bold">Live Kampagnen-Tracking</span>
                                <p className="text-base text-muted-foreground font-normal mt-1">
                                    {totalStats.sent} gesendet • {totalStats.pending} ausstehend • {totalStats.failed} Fehler • {totalStats.opened} geöffnet
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant={autoRefresh ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`gap-2 ${autoRefresh ? "bg-black text-white hover:bg-neutral-800" : ""}`}
                            >
                                <Zap className={`h-4 w-4 ${autoRefresh ? "animate-pulse" : ""}`} />
                                {autoRefresh ? "Auto-Refresh AN" : "Auto-Refresh AUS"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                Aktualisieren
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {campaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Mail className="h-20 w-20 mb-6 opacity-20" />
                            <p className="text-xl font-medium">Keine Kampagnen vorhanden</p>
                            <p className="text-sm mt-2">Starte eine Kampagne im Hintergrund-Modus um sie hier zu sehen</p>
                        </div>
                    ) : (
                        <>
                            {/* Active Campaigns */}
                            {activeCampaigns.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <span className="h-3 w-3 bg-black dark:bg-white rounded-full animate-pulse" />
                                        Aktive Kampagnen ({activeCampaigns.length})
                                    </h3>

                                    <AnimatePresence>
                                        {activeCampaigns.map((campaign) => (
                                            <CampaignCard key={campaign.id} campaign={campaign} isActive />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Completed Campaigns */}
                            {completedCampaigns.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-3 text-muted-foreground">
                                        <CheckCircle className="h-5 w-5" />
                                        Abgeschlossene Kampagnen ({completedCampaigns.length})
                                    </h3>

                                    <AnimatePresence>
                                        {completedCampaigns.map((campaign) => (
                                            <CampaignCard key={campaign.id} campaign={campaign} isActive={false} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            <Card className={`border-2 ${isActive ? "border-black dark:border-white" : "border-neutral-200 dark:border-neutral-800"}`}>
                <CardHeader className="pb-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isActive ? "bg-black dark:bg-white" : "bg-neutral-100 dark:bg-neutral-800"}`}>
                                {isActive ? (
                                    <Send className={`h-6 w-6 ${isActive ? "text-white dark:text-black" : "text-neutral-600"}`} />
                                ) : (
                                    <CheckCircle className="h-6 w-6 text-neutral-600" />
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-lg">
                                    Kampagne vom {format(new Date(campaign.createdAt), "dd. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    ID: {campaign.id.substring(0, 8)} • {campaign.stats.total} E-Mails
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* Inline Stats */}
                            <div className="flex gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <strong>{campaign.stats.sent}</strong> gesendet
                                </span>
                                {campaign.stats.pending > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                                        <strong>{campaign.stats.pending}</strong> ausstehend
                                    </span>
                                )}
                                {campaign.stats.failed > 0 && (
                                    <span className="flex items-center gap-1">
                                        <XCircle className="h-4 w-4 text-red-600" />
                                        <strong>{campaign.stats.failed}</strong> Fehler
                                    </span>
                                )}
                                {campaign.stats.opened > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Eye className="h-4 w-4 text-blue-600" />
                                        <strong>{campaign.stats.opened}</strong> geöffnet
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{progress.toFixed(0)}%</span>
                                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-5 space-y-2">
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full relative overflow-hidden bg-black dark:bg-white"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            >
                                {isActive && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                        animate={{ x: ["-100%", "100%"] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    />
                                )}
                            </motion.div>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{campaign.stats.sent + campaign.stats.failed} von {campaign.stats.total} verarbeitet</span>
                            {campaign.stats.pending > 0 && (
                                <span className="font-medium">{campaign.stats.pending} E-Mails warten auf Versand</span>
                            )}
                        </div>
                    </div>
                </CardHeader>

                {/* Expanded Email List */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CardContent className="pt-0 border-t">
                                <div className="mt-4 space-y-3">
                                    <AnimatePresence>
                                        {campaign.jobs.map((job, index) => (
                                            <EmailRow key={job.id} job={job} index={index} />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    )
}

function EmailRow({ job, index }: { job: EmailJob; index: number }) {
    const [showContent, setShowContent] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
        >
            <div className={`rounded-xl border-2 overflow-hidden ${job.status === "SENT"
                    ? "border-neutral-300 dark:border-neutral-700"
                    : job.status === "FAILED"
                        ? "border-red-300 dark:border-red-800"
                        : "border-amber-300 dark:border-amber-800"
                }`}>
                {/* Main Row */}
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-900">
                    {/* Status Icon */}
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${job.status === "SENT" ? "bg-neutral-100 dark:bg-neutral-800"
                            : job.status === "FAILED" ? "bg-red-100 dark:bg-red-900/30"
                                : "bg-amber-100 dark:bg-amber-900/30"
                        }`}>
                        {job.status === "SENT" ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : job.status === "FAILED" ? (
                            <XCircle className="h-6 w-6 text-red-600" />
                        ) : (
                            <Clock className="h-6 w-6 text-amber-600 animate-pulse" />
                        )}
                    </div>

                    {/* Email Info */}
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base">{job.recipient}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{job.subject}</p>
                    </div>

                    {/* Status Badge */}
                    <Badge variant="outline" className={`shrink-0 text-sm px-3 py-1 ${job.status === "SENT" ? "border-green-600 text-green-600"
                            : job.status === "FAILED" ? "border-red-600 text-red-600"
                                : "border-amber-600 text-amber-600"
                        }`}>
                        {job.status === "SENT" ? "Gesendet" : job.status === "FAILED" ? "Fehler" : "Wartend"}
                    </Badge>

                    {/* Time */}
                    <div className="text-right shrink-0 min-w-[120px]">
                        <p className="text-sm font-medium">
                            {job.sentAt
                                ? format(new Date(job.sentAt), "HH:mm:ss", { locale: de })
                                : format(new Date(job.scheduledFor), "HH:mm", { locale: de })
                            }
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {job.sentAt ? "gesendet" : "geplant"}
                        </p>
                    </div>

                    {/* Tracking */}
                    {job.status === "SENT" && (
                        <div className="shrink-0">
                            {job.openedAt ? (
                                <Badge className="bg-black text-white dark:bg-white dark:text-black">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Geöffnet {job.openCount > 1 && `(${job.openCount}×)`}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                    Nicht geöffnet
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Expand Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setShowContent(!showContent)}
                    >
                        <FileText className="h-4 w-4" />
                    </Button>
                </div>

                {/* Error Message */}
                {job.error && (
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-600">Fehler: {job.error}</p>
                    </div>
                )}

                {/* Expanded Content */}
                <AnimatePresence>
                    {showContent && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t"
                        >
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 space-y-3">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Betreff</p>
                                    <p className="text-sm font-medium mt-1">{job.subject}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nachricht</p>
                                    <p className="text-sm mt-1 whitespace-pre-wrap bg-white dark:bg-neutral-900 p-3 rounded-lg border">
                                        {job.body || "Nachrichteninhalt nicht verfügbar"}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <p className="font-semibold text-muted-foreground uppercase tracking-wide">Job-ID</p>
                                        <p className="font-mono mt-1">{job.id.substring(0, 8)}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-muted-foreground uppercase tracking-wide">Geplant für</p>
                                        <p className="mt-1">{format(new Date(job.scheduledFor), "dd.MM.yyyy HH:mm:ss", { locale: de })}</p>
                                    </div>
                                    {job.openedAt && (
                                        <div>
                                            <p className="font-semibold text-muted-foreground uppercase tracking-wide">Geöffnet am</p>
                                            <p className="mt-1">{format(new Date(job.openedAt), "dd.MM.yyyy HH:mm:ss", { locale: de })}</p>
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
