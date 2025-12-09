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
    AlertCircle, Mail, BarChart3, ExternalLink
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
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
    sent: "#22c55e",
    pending: "#f59e0b",
    failed: "#ef4444",
    opened: "#3b82f6",
    clicked: "#8b5cf6"
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
            case "SENT": return <CheckCircle className="h-4 w-4 text-green-500" />
            case "PENDING": return <Clock className="h-4 w-4 text-amber-500" />
            case "FAILED": return <XCircle className="h-4 w-4 text-red-500" />
            default: return <AlertCircle className="h-4 w-4 text-gray-400" />
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
        { name: "Geöffnet", value: totalStats.opened, color: COLORS.opened },
        { name: "Nicht geöffnet", value: totalStats.sent - totalStats.opened, color: "#e5e7eb" },
    ]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Kampagnen-Tracking
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <span className="text-xl">Kampagnen-Tracking</span>
                                <p className="text-sm text-muted-foreground font-normal">Öffnungen und Klicks verfolgen</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Aktualisieren
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                {campaigns.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Noch keine Hintergrund-Kampagnen vorhanden</p>
                        <p className="text-sm">Tracking ist nur für den Hintergrund-Versand verfügbar</p>
                    </div>
                ) : (
                    <>
                        {/* Stats Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                            {[
                                { label: "Gesendet", value: totalStats.sent, icon: CheckCircle, color: "text-green-500" },
                                { label: "Ausstehend", value: totalStats.pending, icon: Clock, color: "text-amber-500" },
                                { label: "Fehlgeschlagen", value: totalStats.failed, icon: XCircle, color: "text-red-500" },
                                { label: "Geöffnet", value: totalStats.opened, icon: Eye, color: "text-blue-500" },
                                { label: "Geklickt", value: totalStats.clicked, icon: MousePointer, color: "text-purple-500" },
                            ].map((stat) => (
                                <Card key={stat.label} className="relative overflow-hidden">
                                    <CardContent className="p-4">
                                        <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Open Rate Chart */}
                        {totalStats.sent > 0 && (
                            <Card className="mt-4">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Eye className="h-4 w-4" />
                                        Öffnungsrate: {((totalStats.opened / totalStats.sent) * 100).toFixed(1)}%
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Campaigns List */}
                        <div className="space-y-4 mt-4">
                            {campaigns.map((campaign) => (
                                <Card key={campaign.id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Kampagne vom {format(new Date(campaign.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                                            </CardTitle>
                                            <div className="flex gap-2">
                                                <Badge variant="outline">{campaign.stats.sent}/{campaign.stats.total} gesendet</Badge>
                                                <Badge variant="outline" className="text-blue-600">
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    {campaign.stats.opened}
                                                </Badge>
                                                <Badge variant="outline" className="text-purple-600">
                                                    <MousePointer className="h-3 w-3 mr-1" />
                                                    {campaign.stats.clicked}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Empfänger</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Geöffnet</TableHead>
                                                    <TableHead>Klicks</TableHead>
                                                    <TableHead>Details</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {campaign.jobs.slice(0, 10).map((job) => (
                                                    <TableRow key={job.id}>
                                                        <TableCell className="font-medium">{job.recipient}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {getStatusIcon(job.status)}
                                                                <span className="text-sm">{job.status}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {job.openedAt ? (
                                                                <div className="flex items-center gap-2 text-blue-600">
                                                                    <Eye className="h-4 w-4" />
                                                                    <span className="text-xs">
                                                                        {format(new Date(job.openedAt), "dd.MM. HH:mm", { locale: de })}
                                                                        {job.openCount > 1 && ` (${job.openCount}x)`}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {job.clickCount > 0 ? (
                                                                <Badge variant="secondary" className="text-purple-600">
                                                                    <MousePointer className="h-3 w-3 mr-1" />
                                                                    {job.clickCount}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {job.clicks.length > 0 && (
                                                                <div className="text-xs space-y-1">
                                                                    {job.clicks.slice(0, 2).map((click, i) => (
                                                                        <div key={i} className="flex items-center gap-1 text-muted-foreground truncate max-w-[200px]">
                                                                            <ExternalLink className="h-3 w-3" />
                                                                            {click.url}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {campaign.jobs.length > 10 && (
                                            <p className="text-xs text-center text-muted-foreground mt-2">
                                                + {campaign.jobs.length - 10} weitere E-Mails
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
