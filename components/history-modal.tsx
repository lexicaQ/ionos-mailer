"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { SecurityLoader } from "@/components/security-loader"
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
    FileSpreadsheet, FileText, Search, History, Mail, Send, Eye, EyeOff, RefreshCw, X
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
    onRefresh?: () => void
    isSyncing?: boolean
}

// Shorten ID to first 8 characters
function shortId(id: string): string {
    return id.substring(0, 8)
}

export function HistoryModal({ batches, onDeleteBatch, onClearAll, onRefresh, isSyncing = false }: HistoryModalProps) {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed" | "waiting">("all")
    const [trackingStatus, setTrackingStatus] = useState<Record<string, { opened: boolean; openedAt: string | null }>>({})

    // REMOVED: Fake 2s loading animation - data displays immediately from cache

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
            // Use POST to handle large number of IDs (avoids URL length limits)
            const res = await fetch(`/api/track/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: trackingIds })
            });

            if (res.ok) {
                const data = await res.json()
                setTrackingStatus(data)
            }
        } catch (e) {
            console.error('Failed to fetch tracking status:', e)
        }
    }, [trackingIds])

    useEffect(() => {
        if (!open) return;

        // Trigger parent refresh to get latest delivery status on open
        if (onRefresh) onRefresh();

        let interval: NodeJS.Timeout | null = null;

        const startPolling = () => {
            if (interval) return;
            if (trackingIds.length > 0) {
                fetchTrackingStatus();
                interval = setInterval(fetchTrackingStatus, 10000);
            }
        };

        const stopPolling = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                fetchTrackingStatus(); // Immediate refresh on visible
                startPolling();
            }
        };

        // Initial check
        if (!document.hidden) {
            startPolling();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopPolling();
        };
    }, [open, trackingIds, fetchTrackingStatus, onRefresh]);

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
            results = results.filter(r => r.status === 'success')
        } else if (statusFilter === "failed") {
            results = results.filter(r => r.status === 'error' || (!r.success && r.status !== 'waiting'))
        } else if (statusFilter === "waiting") {
            results = results.filter(r => r.status === 'waiting')
        }
        return results
    }, [batches, searchTerm, statusFilter])

    const exportToExcel = async () => {
        const ExcelJS = await import("exceljs")
        const workbook = new ExcelJS.Workbook();

        // Sheet 1: Email History
        const itemSheet = workbook.addWorksheet("Email History");
        itemSheet.columns = [
            { header: "No.", key: "no", width: 10 },
            { header: "Email Address", key: "email", width: 35 },
            { header: "Status", key: "status", width: 15 },
            { header: "Time", key: "time", width: 25 },
            { header: "Error Message", key: "error", width: 40 },
        ];
        allResults.forEach((r, idx) => {
            itemSheet.addRow({
                no: idx + 1,
                email: r.email,
                status: r.status === 'waiting' ? "Waiting" : (r.success ? "Successful" : "Failed"),
                time: format(new Date(r.batchTime), "yyyy-MM-dd HH:mm:ss"),
                error: r.error || "—"
            });
        });

        // Sheet 2: Summary
        const summarySheet = workbook.addWorksheet("Summary");
        summarySheet.columns = [
            { header: "Metric", key: "metric", width: 30 },
            { header: "Value", key: "value", width: 30 },
        ];
        summarySheet.addRow({ metric: "Total Emails", value: stats.totalEmails.toString() });
        summarySheet.addRow({ metric: "Successfully Sent", value: stats.totalSuccess.toString() });
        summarySheet.addRow({ metric: "Failed", value: stats.totalFailed.toString() });
        summarySheet.addRow({ metric: "Success Rate", value: `${stats.totalEmails > 0 ? ((stats.totalSuccess / stats.totalEmails) * 100).toFixed(1) : 0}%` });
        summarySheet.addRow({ metric: "Number of Sessions", value: stats.totalBatches.toString() });
        summarySheet.addRow({ metric: "Export created on", value: format(new Date(), "yyyy-MM-dd HH:mm:ss") });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ionos-mailer-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
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
                r.status === 'waiting' ? "Waiting" : (r.success ? "OK" : "Error"),
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

    // ALWAYS show button (removed: if (batches.length === 0) return null)

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
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold tracking-tight">Email History</h2>
                                    {isSyncing && (
                                        <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.totalEmails} Emails • {stats.totalSuccess} Successful • {stats.totalOpened} Opened
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={fetchTrackingStatus} className="gap-2 h-8 text-xs">
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToExcel} className="hidden sm:flex gap-2 h-8 text-xs">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Excel
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToPDF} className="hidden sm:flex gap-2 h-8 text-xs">
                                <FileText className="h-3.5 w-3.5" />
                                PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { onClearAll(); setOpen(false); }} className="gap-2 h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                                Clear All
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
                                <X className="h-4 w-4" />
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
                                    <SelectItem value="waiting">Waiting</SelectItem>
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

                                {/* Actually, if the email text is smaller, maybe we just need to ensure the header starts at same X. Flex gap handles this. */}
                                {/* User said "move the colum title to the left so it starts at the same position as the actual email addresses below".
                                    The email address is pushed by Status (100px) + Gap?
                                    Ah, the header structure mirrors the row structure: 100px + (mobile hidden Opened?)
                                    Wait, line 407 (Status Col 2) is 80px.
                                    Line 385 (Status Badge) is 100px.
                                    The "Opened" column in header is 110px.
                                    The Row has: Badge(100px) + StatusText(80px).
                                    This mismatch (100+110 vs 100+80) implies misalignment is occurring.
                                    Let's fix the header columns to match the row columns.
                                    Row: [100px Badge] [80px Text] [Flex-1 Email]
                                    Header: [100px Status] [110px "Opened"] [Flex-1 Recipient]
                                    This is why it's misaligned!
                                    "Opened" header corresponds to the "StatusText" column? Or is the "StatusText" actually the opened status?
                                    Line 407 logic shows "Opened" or "Waiting" or "Failed" text.
                                    So Header "Opened" (110px) should match Row "Status Text" (80px?).
                                    I will change Header "Opened" width to 80px to match Row.
                                */}
                                <div className="w-[80px]">Opened</div>
                                <div className="flex-1 -ml-2 sm:ml-0">Recipient</div> {/* Slight negative margin on mobile to pull it left as requested */}
                                <div className="w-[120px] text-right">Sent at</div>
                            </div>

                            {/* Table Rows */}
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {allResults.map((result, idx) => (
                                    <div key={idx} className="p-3 px-4 flex items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-sm gap-4">

                                        {/* Status */}
                                        <div className="w-[100px] flex-shrink-0">
                                            <Badge
                                                variant={result.status === 'success' ? 'default' : 'secondary'}
                                                className={`
                                                    h-6 px-0 text-[10px] border-0 font-bold tracking-wide w-[90px] justify-center shadow-none
                                                    ${result.status === 'success'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100'
                                                        : result.status === 'waiting'
                                                            ? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-100'
                                                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}
                                                `}
                                            >
                                                {result.status === 'success' ? 'SENT' : (result.status === 'waiting' ? 'WAITING' : 'FAILED')}
                                            </Badge>
                                            {result.error && (
                                                <div className="text-[9px] text-red-500 mt-1 truncate max-w-[90px]" title={result.error}>
                                                    {result.error}
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Column (Text only, small) */}
                                        <div className="w-[80px] flex-shrink-0 flex items-center">
                                            {(() => {
                                                const status = result.status; // 'waiting', 'success', 'error'
                                                const isOpened = result.trackingId && trackingStatus[result.trackingId]?.opened;

                                                if (status === 'waiting') {
                                                    return <span className="text-[10px] font-mono text-neutral-400">---</span>;
                                                }
                                                if (status === 'error') {
                                                    return <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Failed</span>;
                                                }
                                                // Success case
                                                if (isOpened) {
                                                    return (
                                                        <div className="flex flex-col leading-none">
                                                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                                                                {result.trackingId && trackingStatus[result.trackingId]?.openedAt
                                                                    ? format(new Date(trackingStatus[result.trackingId].openedAt!), "dd.MM 'at' HH:mm")
                                                                    : 'Opened'}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return <span className="text-[10px] font-bold text-neutral-300 dark:text-neutral-600 tracking-wider">---</span>;
                                            })()}
                                        </div>

                                        {/* Recipient */}
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="text-[10px] sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={result.email}>
                                                {result.email}
                                            </div>
                                        </div>

                                        {/* Time */}
                                        <div className="flex items-center justify-end text-xs text-muted-foreground flex-shrink-0 w-[120px]">
                                            <div className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                                {format(new Date(result.batchTime), "dd.MM 'at' HH:mm")}
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
