"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Activity, CheckCircle, XCircle, Clock, Mail,
    RefreshCw, Zap, Send, Eye, MousePointer
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
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

    // Auto-refresh every 10 seconds when open
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
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[98vw] max-w-[1800px] h-[95vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-black dark:bg-white flex items-center justify-center shrink-0 relative">
                                <Activity className="h-6 w-6 text-white dark:text-black" />
                                {activeCampaigns.length > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse flex items-center justify-center">
                                        <span className="text-[10px] text-white font-bold">{activeCampaigns.length}</span>
                                    </span>
                                )}
                            </div>
                            <div>
                                <span className="text-2xl font-bold">Live Kampagnen-Tracking</span>
                                <p className="text-sm text-muted-foreground font-normal">Echtzeit-Visualisierung aller Kampagnen</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant={autoRefresh ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className="gap-2"
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
                            <Mail className="h-16 w-16 mb-4 opacity-30" />
                            <p className="text-lg font-medium">Noch keine Kampagnen</p>
                            <p className="text-sm">Starte eine Kampagne im Hintergrund-Modus</p>
                        </div>
                    ) : (
                        <>
                            {/* Global Stats Bar */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0 }}
                                >
                                    <Card className="border-2 border-neutral-200 dark:border-neutral-700">
                                        <CardContent className="p-4 text-center">
                                            <Mail className="h-6 w-6 mx-auto mb-2 text-neutral-600" />
                                            <p className="text-3xl font-bold">{totalStats.total}</p>
                                            <p className="text-xs text-muted-foreground">Gesamt</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
                                        <CardContent className="p-4 text-center">
                                            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                                            <p className="text-3xl font-bold text-green-600">{totalStats.sent}</p>
                                            <p className="text-xs text-muted-foreground">Gesendet</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
                                        <CardContent className="p-4 text-center">
                                            <Clock className="h-6 w-6 mx-auto mb-2 text-amber-600 animate-pulse" />
                                            <p className="text-3xl font-bold text-amber-600">{totalStats.pending}</p>
                                            <p className="text-xs text-muted-foreground">Ausstehend</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
                                        <CardContent className="p-4 text-center">
                                            <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                                            <p className="text-3xl font-bold text-red-600">{totalStats.failed}</p>
                                            <p className="text-xs text-muted-foreground">Fehler</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
                                        <CardContent className="p-4 text-center">
                                            <Eye className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                                            <p className="text-3xl font-bold text-blue-600">{totalStats.opened}</p>
                                            <p className="text-xs text-muted-foreground">Geöffnet</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>

                            {/* Active Campaigns */}
                            {activeCampaigns.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
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
                                    <h3 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle className="h-4 w-4" />
                                        Abgeschlossene Kampagnen ({completedCampaigns.length})
                                    </h3>

                                    <AnimatePresence>
                                        {completedCampaigns.slice(0, 5).map((campaign) => (
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        >
            <Card className={`border-2 ${isActive ? "border-green-300 dark:border-green-700" : "border-neutral-200 dark:border-neutral-800"}`}>
                <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-neutral-100 dark:bg-neutral-800"}`}>
                                {isActive ? (
                                    <Send className="h-5 w-5 text-green-600 animate-pulse" />
                                ) : (
                                    <CheckCircle className="h-5 w-5 text-neutral-600" />
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-base">
                                    Kampagne vom {format(new Date(campaign.createdAt), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    ID: {campaign.id.substring(0, 8)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {campaign.stats.sent}
                                </Badge>
                                {campaign.stats.pending > 0 && (
                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 animate-pulse">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {campaign.stats.pending}
                                    </Badge>
                                )}
                                {campaign.stats.failed > 0 && (
                                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {campaign.stats.failed}
                                    </Badge>
                                )}
                                {campaign.stats.opened > 0 && (
                                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">
                                        <Eye className="h-3 w-3 mr-1" />
                                        {campaign.stats.opened}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-2">
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full relative overflow-hidden"
                                style={{
                                    background: `linear-gradient(90deg, #22c55e 0%, #22c55e ${(campaign.stats.sent / campaign.stats.total) * 100}%, #ef4444 ${(campaign.stats.sent / campaign.stats.total) * 100}%, #ef4444 ${((campaign.stats.sent + campaign.stats.failed) / campaign.stats.total) * 100}%)`,
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            >
                                {isActive && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                        animate={{ x: ["-100%", "100%"] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    />
                                )}
                            </motion.div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{campaign.stats.sent + campaign.stats.failed} von {campaign.stats.total} verarbeitet</span>
                            <span>{campaign.stats.pending} ausstehend</span>
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
                                <div className="max-h-[400px] overflow-y-auto mt-4 space-y-2">
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
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`flex items-center gap-3 p-3 rounded-lg border ${job.status === "SENT"
                    ? "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
                    : job.status === "FAILED"
                        ? "bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                        : "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
                }`}
        >
            {/* Status Icon */}
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${job.status === "SENT" ? "bg-green-100 dark:bg-green-900/30"
                    : job.status === "FAILED" ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-amber-100 dark:bg-amber-900/30"
                }`}>
                {job.status === "SENT" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                ) : job.status === "FAILED" ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                    <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                )}
            </div>

            {/* Email Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{job.recipient}</p>
                <p className="text-sm text-muted-foreground truncate">{job.subject}</p>
            </div>

            {/* Status & Time */}
            <div className="text-right shrink-0">
                <Badge variant={
                    job.status === "SENT" ? "default"
                        : job.status === "FAILED" ? "destructive"
                            : "secondary"
                } className={
                    job.status === "SENT" ? "bg-green-600"
                        : job.status === "PENDING" ? "bg-amber-600"
                            : ""
                }>
                    {job.status === "SENT" ? "Gesendet" : job.status === "FAILED" ? "Fehler" : "Wartend"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                    {job.sentAt
                        ? format(new Date(job.sentAt), "HH:mm:ss", { locale: de })
                        : format(new Date(job.scheduledFor), "HH:mm", { locale: de }) + " geplant"
                    }
                </p>
            </div>

            {/* Tracking Info */}
            {job.status === "SENT" && (
                <div className="flex items-center gap-2 shrink-0">
                    {job.openedAt ? (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">
                            <Eye className="h-3 w-3 mr-1" />
                            Geöffnet
                            {job.openCount > 1 && ` (${job.openCount}×)`}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                            <Eye className="h-3 w-3 mr-1" />
                            Nicht geöffnet
                        </Badge>
                    )}
                </div>
            )}

            {/* Error */}
            {job.error && (
                <p className="text-xs text-red-600 max-w-[150px] truncate" title={job.error}>
                    {job.error}
                </p>
            )}
        </motion.div>
    )
}
