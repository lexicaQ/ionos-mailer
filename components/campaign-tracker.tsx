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
    AlertCircle, Mail, BarChart3, ExternalLink, TrendingUp, Users
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar
} from "recharts"
import { Logo } from "@/components/logo"

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

export function CampaignTracker() {
    const [open, setOpen] = useState(false)
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

    const fetchCampaigns = async () => {
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
    }

    useEffect(() => {
        if (open) {
            fetchCampaigns()
        }
    }, [open])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "SENT": return <CheckCircle className="h-4 w-4 text-green-600" />
            case "PENDING": return <Clock className="h-4 w-4 text-amber-500" />
            case "FAILED": return <XCircle className="h-4 w-4 text-red-600" />
            default: return <AlertCircle className="h-4 w-4 text-neutral-400" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SENT": return <Badge className="bg-green-100 text-green-700 border-green-200">Gesendet</Badge>
            case "PENDING": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Ausstehend</Badge>
            case "FAILED": return <Badge className="bg-red-100 text-red-700 border-red-200">Fehler</Badge>
            default: return <Badge variant="outline">Unbekannt</Badge>
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

    const openRate = totalStats.sent > 0 ? ((totalStats.opened / totalStats.sent) * 100) : 0
    const clickRate = totalStats.opened > 0 ? ((totalStats.clicked / totalStats.opened) * 100) : 0

    // Radial chart data for open rate
    const radialData = [
        { name: "Öffnungsrate", value: openRate, fill: "#000" },
    ]

    // Area chart data for timeline
    const areaData = campaigns.slice(-7).map((c, idx) => ({
        name: format(new Date(c.createdAt), "dd.MM", { locale: de }),
        Gesendet: c.stats.sent,
        Geöffnet: c.stats.opened,
        Geklickt: c.stats.clicked,
    }))

    // Pie chart for status distribution
    const pieData = [
        { name: "Gesendet", value: totalStats.sent, fill: "#22c55e" },
        { name: "Ausstehend", value: totalStats.pending, fill: "#f59e0b" },
        { name: "Fehlgeschlagen", value: totalStats.failed, fill: "#ef4444" },
    ].filter(d => d.value > 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-black dark:border-white">
                    <BarChart3 className="h-4 w-4" />
                    Kampagnen-Tracking
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto bg-white dark:bg-black border-neutral-200 dark:border-neutral-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 text-black dark:text-white">
                                <Logo className="w-full h-full" />
                            </div>
                            <div>
                                <span className="text-2xl font-bold">Kampagnen-Tracking</span>
                                <p className="text-sm text-neutral-500 font-normal">Öffnungen, Klicks und Zustellungen verfolgen</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading} className="border-black dark:border-white">
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Aktualisieren
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                {campaigns.length === 0 ? (
                    <div className="text-center py-20 text-neutral-500">
                        <div className="h-20 w-20 mx-auto mb-6 text-neutral-300">
                            <Logo className="w-full h-full" />
                        </div>
                        <p className="text-lg font-medium">Noch keine Hintergrund-Kampagnen</p>
                        <p className="text-sm mt-2">Aktiviere den Hintergrund-Modus um E-Mails zu tracken</p>
                    </div>
                ) : (
                    <div className="space-y-8 mt-6">
                        {/* Stats Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: "Gesamt", value: totalStats.total, icon: Mail },
                                { label: "Gesendet", value: totalStats.sent, icon: CheckCircle, color: "text-green-600" },
                                { label: "Ausstehend", value: totalStats.pending, icon: Clock, color: "text-amber-500" },
                                { label: "Fehlgeschlagen", value: totalStats.failed, icon: XCircle, color: "text-red-600" },
                                { label: "Geöffnet", value: totalStats.opened, icon: Eye },
                                { label: "Geklickt", value: totalStats.clicked, icon: MousePointer },
                            ].map((stat) => (
                                <Card key={stat.label} className="border-neutral-200 dark:border-neutral-800">
                                    <CardContent className="p-5">
                                        <stat.icon className={`h-5 w-5 mb-3 ${stat.color || "text-black dark:text-white"}`} />
                                        <p className="text-3xl font-bold">{stat.value}</p>
                                        <p className="text-sm text-neutral-500 mt-1">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Charts Section */}
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Radial Chart - Open Rate */}
                            <Card className="border-neutral-200 dark:border-neutral-800">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        Öffnungsrate
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-52 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius="60%" 
                                                outerRadius="90%" 
                                                barSize={20} 
                                                data={radialData}
                                                startAngle={90}
                                                endAngle={90 - (openRate * 3.6)}
                                            >
                                                <RadialBar
                                                    background={{ fill: '#e5e5e5' }}
                                                    dataKey="value"
                                                    cornerRadius={10}
                                                />
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                                            <span className="text-4xl font-bold">{openRate.toFixed(1)}%</span>
                                            <span className="text-sm text-neutral-500">geöffnet</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pie Chart - Status Distribution */}
                            <Card className="border-neutral-200 dark:border-neutral-800">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Zustellstatus
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    strokeWidth={2}
                                                    stroke="#fff"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Area Chart - Timeline */}
                            <Card className="border-neutral-200 dark:border-neutral-800">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4" />
                                        Kampagnen-Verlauf
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={areaData}>
                                                <defs>
                                                    <linearGradient id="colorGesendet" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#000" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                                <XAxis dataKey="name" fontSize={11} />
                                                <YAxis fontSize={11} />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="Gesendet" stroke="#000" fillOpacity={1} fill="url(#colorGesendet)" strokeWidth={2} />
                                                <Area type="monotone" dataKey="Geöffnet" stroke="#666" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Campaigns List */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Alle Kampagnen ({campaigns.length})
                            </h3>
                            
                            {campaigns.map((campaign) => (
                                <Card key={campaign.id} className="border-neutral-200 dark:border-neutral-800">
                                    <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <CardTitle className="text-base font-semibold flex items-center gap-3">
                                                <Mail className="h-5 w-5" />
                                                Kampagne vom {format(new Date(campaign.createdAt), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                                            </CardTitle>
                                            <div className="flex gap-2 flex-wrap">
                                                <Badge variant="outline" className="border-black dark:border-white">
                                                    {campaign.stats.sent}/{campaign.stats.total} gesendet
                                                </Badge>
                                                <Badge variant="outline" className="border-black dark:border-white">
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    {campaign.stats.opened} geöffnet
                                                </Badge>
                                                <Badge variant="outline" className="border-black dark:border-white">
                                                    <MousePointer className="h-3 w-3 mr-1" />
                                                    {campaign.stats.clicked} geklickt
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-neutral-50 dark:bg-neutral-900">
                                                    <TableHead className="font-semibold">Empfänger</TableHead>
                                                    <TableHead className="font-semibold">Betreff</TableHead>
                                                    <TableHead className="font-semibold">Status</TableHead>
                                                    <TableHead className="font-semibold">Geöffnet</TableHead>
                                                    <TableHead className="font-semibold">Klicks</TableHead>
                                                    <TableHead className="font-semibold">Geplant für</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {campaign.jobs.map((job) => (
                                                    <TableRow key={job.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                                                        <TableCell className="font-medium">{job.recipient}</TableCell>
                                                        <TableCell className="max-w-[200px]">
                                                            <span className="block truncate" title={job.subject}>
                                                                {job.subject}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                                                        <TableCell>
                                                            {job.openedAt ? (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2 text-green-600">
                                                                        <Eye className="h-4 w-4" />
                                                                        <span className="text-sm font-medium">Ja</span>
                                                                    </div>
                                                                    <div className="text-xs text-neutral-500">
                                                                        {format(new Date(job.openedAt), "dd.MM.yyyy HH:mm", { locale: de })}
                                                                        {job.openCount > 1 && (
                                                                            <span className="ml-1">({job.openCount}x)</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-neutral-400">Noch nicht</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {job.clickCount > 0 ? (
                                                                <div className="space-y-1">
                                                                    <Badge className="bg-black text-white">
                                                                        <MousePointer className="h-3 w-3 mr-1" />
                                                                        {job.clickCount} Klick{job.clickCount !== 1 && "s"}
                                                                    </Badge>
                                                                    <div className="text-xs text-neutral-500 space-y-0.5">
                                                                        {job.clicks.map((click, i) => (
                                                                            <div key={i} className="flex items-center gap-1 truncate max-w-[180px]">
                                                                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                                                <span title={click.url}>{click.url}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-neutral-400">Keine</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-neutral-600">
                                                            {format(new Date(job.scheduledFor), "dd.MM.yyyy HH:mm", { locale: de })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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
