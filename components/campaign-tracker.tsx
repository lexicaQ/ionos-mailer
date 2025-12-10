"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    RefreshCw, Eye, MousePointer, Clock, CheckCircle, XCircle,
    AlertCircle, Mail, BarChart3, ExternalLink, Send
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts"

interface Click {
    url: string
    clickedAt: string
}

interface Job {
    id: string
    trackingId: string
    recipient: string
    subject: string
    status: string
    scheduledFor: string
    sentAt: string | null
    error: string | null
    openedAt: string | null
    openCount: number
    clickCount: number
    clicks: Click[]
}

interface Campaign {
    id: string
    createdAt: string
    jobs: Job[]
    stats: {
        total: number
        sent: number
        pending: number
        failed: number
        opened: number
        clicked: number
    }
}

const COLORS = {
    primary: "#000000",
    secondary: "#525252",
    muted: "#d4d4d4"
}

export function CampaignTracker() {
    const [open, setOpen] = useState(false)
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(false)

    const fetchCampaigns = async () => {
        setLoading(true)
        try {
            const userId = localStorage.getItem("ionos-mailer-user-id");
            const res = await fetch("/api/campaigns/status", {
                headers: {
                    'x-user-id': userId || ''
                }
            })
            if (res.ok) {
                const data = await res.json()
                setCampaigns(data)
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error)
        } finally {
            setLoading(false)
        }
    }

    const deleteCampaign = async (id: string) => {
        if (!confirm("Kampagne wirklich löschen? Alle Daten gehen verloren.")) return;

        try {
            const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
            if (res.ok) {
                setCampaigns(prev => prev.filter(c => c.id !== id));
            }
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        if (open) {
            fetchCampaigns()
        }
    }, [open])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SENT":
                return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30"><CheckCircle className="h-3 w-3 mr-1" />Gesendet</Badge>
            case "PENDING":
                return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30"><Clock className="h-3 w-3 mr-1" />Ausstehend</Badge>
            case "FAILED":
                return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30"><XCircle className="h-3 w-3 mr-1" />Fehler</Badge>
            default:
                return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Unbekannt</Badge>
        }
    }

    const totalStats = campaigns.reduce(
        (acc, c) => ({
            total: acc.total + c.stats.total,
            sent: acc.sent + c.stats.sent,
            pending: acc.pending + c.stats.pending,
            failed: acc.failed + c.stats.failed,
            opened: acc.opened + c.stats.opened,
            clicked: acc.clicked + c.stats.clicked,
        }),
        { total: 0, sent: 0, pending: 0, failed: 0, opened: 0, clicked: 0 }
    )

    const pieData = [
        { name: "Geöffnet", value: totalStats.opened },
        { name: "Nicht geöffnet", value: Math.max(0, totalStats.sent - totalStats.opened) },
    ]

    const areaData = campaigns.slice(-10).map((c) => ({
        name: format(new Date(c.createdAt), "dd.MM", { locale: de }),
        Gesendet: c.stats.sent,
        Geöffnet: c.stats.opened,
    }))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Kampagnen-Tracking
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[98vw] max-w-[2400px] h-[98vh] max-h-[98vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-black dark:bg-white flex items-center justify-center">
                                <Mail className="h-6 w-6 text-white dark:text-black" />
                            </div>
                            <div>
                                <span className="text-2xl font-bold">Kampagnen-Tracking</span>
                                <p className="text-sm text-muted-foreground font-normal">Öffnungen, Klicks & Statistiken verfolgen</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Aktualisieren
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                {campaigns.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <Mail className="h-16 w-16 mx-auto mb-6 opacity-30" />
                        <p className="text-lg font-medium">Noch keine Hintergrund-Kampagnen</p>
                        <p className="text-sm mt-2">Tracking ist nur für den Hintergrund-Versand verfügbar</p>
                    </div>
                ) : (
                    <div className="space-y-8 mt-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: "Gesamt", value: totalStats.total, icon: Mail },
                                { label: "Gesendet", value: totalStats.sent, icon: Send, color: "text-green-600" },
                                { label: "Ausstehend", value: totalStats.pending, icon: Clock, color: "text-amber-600" },
                                { label: "Fehler", value: totalStats.failed, icon: XCircle, color: "text-red-600" },
                                { label: "Geöffnet", value: totalStats.opened, icon: Eye },
                                { label: "Geklickt", value: totalStats.clicked, icon: MousePointer },
                            ].map((stat) => (
                                <Card key={stat.label} className="border-neutral-200 dark:border-neutral-800">
                                    <CardContent className="p-5">
                                        <stat.icon className={`h-5 w-5 mb-3 ${stat.color || "text-neutral-600"}`} />
                                        <p className="text-3xl font-bold">{stat.value}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Charts Row */}
                        <div className="grid lg:grid-cols-2 gap-6">
                            <Card className="border-neutral-200 dark:border-neutral-800">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Eye className="h-4 w-4" />
                                        Öffnungsrate
                                        <span className="ml-auto text-2xl font-bold">
                                            {totalStats.sent > 0 ? ((totalStats.opened / totalStats.sent) * 100).toFixed(1) : 0}%
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                                                    <Cell fill={COLORS.primary} />
                                                    <Cell fill={COLORS.muted} />
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-neutral-200 dark:border-neutral-800">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        Kampagnen-Verlauf
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={areaData}>
                                                <defs>
                                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#000" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#000" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                                <XAxis dataKey="name" fontSize={12} stroke="#737373" />
                                                <YAxis fontSize={12} stroke="#737373" />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="Gesendet" stroke="#000" fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} />
                                                <Area type="monotone" dataKey="Geöffnet" stroke="#525252" fillOpacity={0.5} fill="#d4d4d4" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Campaigns Detail */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Alle Kampagnen ({campaigns.length})
                            </h3>

                            {campaigns.map((campaign) => (
                                <Card key={campaign.id} className="border-neutral-200 dark:border-neutral-800">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <CardTitle className="text-base font-medium">
                                                Kampagne vom {format(new Date(campaign.createdAt), "dd. MMMM yyyy, HH:mm 'Uhr'", { locale: de })}
                                            </CardTitle>
                                            <div className="flex gap-3">
                                                <Badge variant="outline" className="text-sm px-3 py-1">
                                                    {campaign.stats.sent}/{campaign.stats.total} gesendet
                                                </Badge>
                                                <Badge variant="outline" className="text-sm px-3 py-1">
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    {campaign.stats.opened} geöffnet
                                                </Badge>
                                                <Badge variant="outline" className="text-sm px-3 py-1">
                                                    <MousePointer className="h-3 w-3 mr-1" />
                                                    {campaign.stats.clicked} geklickt
                                                </Badge>
                                                <Button size="icon" variant="ghost" onClick={() => deleteCampaign(campaign.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                    <XCircle className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-neutral-50 dark:bg-neutral-900">
                                                        <TableHead className="font-semibold">Empfänger</TableHead>
                                                        <TableHead className="font-semibold">Betreff</TableHead>
                                                        <TableHead className="font-semibold">Status</TableHead>
                                                        <TableHead className="font-semibold">Gesendet am</TableHead>
                                                        <TableHead className="font-semibold">Geöffnet</TableHead>
                                                        <TableHead className="font-semibold">Klicks</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {campaign.jobs.map((job) => (
                                                        <TableRow key={job.id}>
                                                            <TableCell className="font-medium">{job.recipient}</TableCell>
                                                            <TableCell>{job.subject}</TableCell>
                                                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {job.sentAt ? format(new Date(job.sentAt), "dd.MM.yyyy HH:mm", { locale: de }) : "—"}
                                                            </TableCell>
                                                            <TableCell>
                                                                {job.openedAt ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Eye className="h-4 w-4" />
                                                                        <span className="text-sm">
                                                                            {format(new Date(job.openedAt), "dd.MM. HH:mm", { locale: de })}
                                                                            {job.openCount > 1 && ` (${job.openCount}×)`}
                                                                        </span>
                                                                    </div>
                                                                ) : <span className="text-muted-foreground">—</span>}
                                                            </TableCell>
                                                            <TableCell>
                                                                {job.clickCount > 0 ? (
                                                                    <div className="space-y-1">
                                                                        <Badge variant="secondary" className="mb-1">
                                                                            <MousePointer className="h-3 w-3 mr-1" />
                                                                            {job.clickCount} Klick{job.clickCount > 1 ? 's' : ''}
                                                                        </Badge>
                                                                        {job.clicks.map((click, i) => (
                                                                            <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                                                                <span className="break-all">{click.url}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : <span className="text-muted-foreground">—</span>}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
