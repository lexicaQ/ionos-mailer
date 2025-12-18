"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { SendResult } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    CheckCircle, XCircle, Trash2, Filter,
    FileSpreadsheet, FileText, Search, History, Mail, Send, Eye, EyeOff
} from "lucide-react"
import { format } from "date-fns"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts"

export interface HistoryBatch {
    id: string
    sentAt: string
    results: SendResult[]
    total: number
    success: number
    failed: number
    body?: string
    recipientList?: any
    subject?: string
    status?: string
}

interface HistoryModalProps {
    batches: HistoryBatch[]
    onDeleteBatch: (id: string) => void
    onClearAll: () => void
}

// Shorten ID to first 8 characters
function shortId(id: string): string {
    return id.substring(0, 8)
}

export function HistoryModal({ batches, onDeleteBatch, onClearAll }: HistoryModalProps) {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all")
    const [trackingStatus, setTrackingStatus] = useState<Record<string, { opened: boolean; openedAt: string | null }>>({})

    // Collect all tracking IDs from batches
    const trackingIds = useMemo(() => {
        const ids: string[] = []
        batches.forEach(batch => {
            batch.results.forEach(r => {
                if (r.trackingId) ids.push(r.trackingId)
            })
        })
        return ids
    }, [batches])

    // Poll for tracking status when modal is open
    const fetchTrackingStatus = useCallback(async () => {
        if (trackingIds.length === 0) return
        try {
            const res = await fetch(`/api/track/status?ids=${trackingIds.join(',')}`)
            if (res.ok) {
                const data = await res.json()
                setTrackingStatus(data)
            }
        } catch (e) {
            console.error('Failed to fetch tracking status:', e)
        }
    }, [trackingIds])

    useEffect(() => {
        if (open && trackingIds.length > 0) {
            fetchTrackingStatus()
            // Poll every 30 seconds
            const interval = setInterval(fetchTrackingStatus, 30000)
            return () => clearInterval(interval)
        }
    }, [open, trackingIds, fetchTrackingStatus])

    const stats = useMemo(() => {
        const totalEmails = batches.reduce((sum, b) => sum + b.total, 0)
        const totalSuccess = batches.reduce((sum, b) => sum + b.success, 0)
        const totalFailed = batches.reduce((sum, b) => sum + b.failed, 0)

        // Calculate opened stats based on trackingStatus
        let totalOpened = 0
        Object.values(trackingStatus).forEach(status => {
            if (status.opened) totalOpened++
        })

        return { totalEmails, totalSuccess, totalFailed, totalOpened, totalBatches: batches.length }
    }, [batches, trackingStatus])

    const pieData = [
        { name: "Successful", value: stats.totalSuccess },
        { name: "Failed", value: stats.totalFailed },
    ]

    const areaData = batches.slice(-10).map(b => ({
        name: format(new Date(b.sentAt), "MMM dd HH:mm"),
        Successful: b.success,
        Failed: b.failed,
    }))

    const allResults = useMemo(() => {
        let results: (SendResult & { batchId: string; batchTime: string })[] = []
        batches.forEach(batch => {
            batch.results.forEach(r => {
                results.push({ ...r, batchId: batch.id, batchTime: batch.sentAt })
            })
        })

        if (searchTerm) {
            results = results.filter(r => r.email.toLowerCase().includes(searchTerm.toLowerCase()))
        }

        if (statusFilter === "success") {
            results = results.filter(r => r.success)
        } else if (statusFilter === "failed") {
            results = results.filter(r => !r.success)
        }
        return results
    }, [batches, searchTerm, statusFilter])

    const exportToExcel = async () => {
        const XLSX = await import("xlsx")
        const data = allResults.map((r, idx) => ({
            "No.": idx + 1,
            "Email Address": r.email,
            "Status": r.success ? "Successful" : "Failed",
            "Time": format(new Date(r.batchTime), "yyyy-MM-dd HH:mm:ss"),
            "Error Message": r.error || "—",
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Email History")

        const summary = [
            { "Metric": "Total Emails", "Wert": stats.totalEmails.toString() },
            { "Metric": "Successfully Sent", "Wert": stats.totalSuccess.toString() },
            { "Metric": "Failed", "Wert": stats.totalFailed.toString() },
            { "Metric": "Success Rate", "Wert": `${stats.totalEmails > 0 ? ((stats.totalSuccess / stats.totalEmails) * 100).toFixed(1) : 0}%` },
            { "Metric": "Number of Sessions", "Wert": stats.totalBatches.toString() },
            { "Metric": "Export created on", "Wert": format(new Date(), "yyyy-MM-dd HH:mm:ss") },
        ]
        const wsSummary = XLSX.utils.json_to_sheet(summary)
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary")

        XLSX.writeFile(wb, `ionos-mailer-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`)
    }

    const exportToPDF = async () => {
        const { jsPDF } = await import("jspdf")
        const autoTable = (await import("jspdf-autotable")).default

        const doc = new jsPDF({ orientation: "landscape" })

        // Header
        doc.setFontSize(22)
        doc.setTextColor(0, 0, 0)
        doc.text("IONOS Mailer", 20, 18)

        doc.setFontSize(12)
        doc.text("Email Delivery Report", 20, 26)

        doc.setFontSize(9)
        doc.setTextColor(80, 80, 80)
        doc.text(`Created: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, 20, 32)

        // Summary
        doc.setFontSize(11)
        doc.setTextColor(0, 0, 0)
        doc.text("Summary", 20, 42)

        autoTable(doc, {
            startY: 46,
            head: [["Metric", "Value"]],
            body: [
                ["Total Emails", stats.totalEmails.toString()],
                ["Successful", stats.totalSuccess.toString()],
                ["Failed", stats.totalFailed.toString()],
                ["Success Rate", `${stats.totalEmails > 0 ? ((stats.totalSuccess / stats.totalEmails) * 100).toFixed(1) : 0}%`],
            ],
            theme: "plain",
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 20 },
            tableWidth: 80,
        })

        // Details
        doc.setFontSize(11)
        doc.text("Email Details", 20, (doc as any).lastAutoTable.finalY + 12)

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 16,
            head: [["No.", "Email Address", "Status", "Time", "Error"]],
            body: allResults.map((r, idx) => [
                (idx + 1).toString(),
                r.email,
                r.success ? "OK" : "Error",
                format(new Date(r.batchTime), "yyyy-MM-dd HH:mm"),
                r.error ? r.error.substring(0, 30) : "—",
            ]),
            theme: "plain",
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 7 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 20, right: 20 },
        })

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(7)
            doc.setTextColor(120, 120, 120)
            doc.text(`Page ${i}/${pageCount} | IONOS Mailer`, 20, doc.internal.pageSize.height - 8)
        }

        doc.save(`ionos-mailer-bericht-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`)
    }

    if (batches.length === 0) return null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <History className="h-4 w-4" />
                    History
                    <Badge variant="secondary" className="ml-1">{stats.totalEmails}</Badge>
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-neutral-950 rounded-lg border shadow-lg text-foreground">

                {/* Header - Matching Live Tracker Style */}
                <div className="flex flex-col border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                                <History className="h-5 w-5 text-white dark:text-black" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">Email History</h2>
                                <p className="text-xs text-muted-foreground">
                                    {stats.totalEmails} Emails • {stats.totalSuccess} Successful • {stats.totalOpened} Opened
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={exportToExcel} className="hidden sm:flex gap-2 h-8 text-xs">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Excel
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToPDF} className="hidden sm:flex gap-2 h-8 text-xs">
                                <FileText className="h-3.5 w-3.5" />
                                PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={onClearAll} className="gap-2 h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                                Clear
                            </Button>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="px-6 pb-4">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search email..."
                                    className="pl-9 bg-neutral-50 dark:bg-neutral-800 border-none h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                                <SelectTrigger className="w-[140px] bg-neutral-50 dark:bg-neutral-800 border-none h-10">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="success">Successful</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Content - Matching Live Tracker Table Style */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50/50 dark:bg-black/20">
                    {allResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <Mail className="h-12 w-12 opacity-20 mb-4" />
                            <p>No emails found</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                            {/* Table Header */}
                            <div className="bg-neutral-50/30 dark:bg-neutral-900/30 px-4 py-2 flex gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                                <div className="w-[100px]">Status</div>
                                <div className="w-[110px]">Opened</div>
                                <div className="flex-1">Recipient</div>
                                <div className="w-[120px] text-right">Sent at</div>
                            </div>

                            {/* Table Rows */}
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {allResults.map((result, idx) => (
                                    <div key={idx} className="p-3 px-4 flex items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-sm gap-4">

                                        {/* Status */}
                                        <div className="w-[100px] flex-shrink-0">
                                            <Badge
                                                variant={result.success ? 'default' : 'secondary'}
                                                className={`
                                                    h-6 px-0 text-[10px] border-0 font-bold tracking-wide w-[90px] justify-center shadow-none
                                                    ${result.success
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100'
                                                        : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}
                                                `}
                                            >
                                                {result.success ? 'SENT' : 'FAILED'}
                                            </Badge>
                                            {result.error && (
                                                <div className="text-[9px] text-red-500 mt-1 truncate max-w-[90px]" title={result.error}>
                                                    {result.error}
                                                </div>
                                            )}
                                        </div>

                                        {/* Opened Status - Show time only */}
                                        <div className="w-[80px] flex-shrink-0">
                                            {result.trackingId ? (
                                                trackingStatus[result.trackingId]?.opened ? (
                                                    <span className="text-xs text-green-600 dark:text-green-400 font-mono">
                                                        {trackingStatus[result.trackingId]?.openedAt
                                                            ? format(new Date(trackingStatus[result.trackingId].openedAt!), "MMM dd HH:mm")
                                                            : 'Opened'
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground opacity-50">—</span>
                                                )
                                            ) : (
                                                <span className="text-xs text-muted-foreground opacity-50">—</span>
                                            )}
                                        </div>

                                        {/* Recipient */}
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={result.email}>
                                                {result.email}
                                            </div>
                                        </div>

                                        {/* Time */}
                                        <div className="flex items-center justify-end text-xs text-muted-foreground flex-shrink-0 w-[120px]">
                                            <div className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                                {format(new Date(result.batchTime), "dd.MM HH:mm")}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
