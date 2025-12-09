"use client"

import { useState, useMemo } from "react"
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
    FileSpreadsheet, FileText, Search, History, Mail, Send
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts"

export interface HistoryBatch {
    id: string
    timestamp: string
    results: SendResult[]
    total: number
    success: number
    failed: number
}

interface HistoryModalProps {
    batches: HistoryBatch[]
    onDeleteBatch: (id: string) => void
    onClearAll: () => void
}

export function HistoryModal({ batches, onDeleteBatch, onClearAll }: HistoryModalProps) {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all")

    const stats = useMemo(() => {
        const totalEmails = batches.reduce((sum, b) => sum + b.total, 0)
        const totalSuccess = batches.reduce((sum, b) => sum + b.success, 0)
        const totalFailed = batches.reduce((sum, b) => sum + b.failed, 0)
        return { totalEmails, totalSuccess, totalFailed, totalBatches: batches.length }
    }, [batches])

    const pieData = [
        { name: "Erfolgreich", value: stats.totalSuccess },
        { name: "Fehlgeschlagen", value: stats.totalFailed },
    ]

    const areaData = batches.slice(-10).map(b => ({
        name: format(new Date(b.timestamp), "dd.MM HH:mm", { locale: de }),
        Erfolgreich: b.success,
        Fehlgeschlagen: b.failed,
    }))

    const allResults = useMemo(() => {
        let results: (SendResult & { batchId: string; batchTime: string })[] = []
        batches.forEach(batch => {
            batch.results.forEach(r => {
                results.push({ ...r, batchId: batch.id, batchTime: batch.timestamp })
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
            "Nr.": idx + 1,
            "E-Mail Adresse": r.email,
            "Status": r.success ? "Erfolgreich" : "Fehlgeschlagen",
            "Sitzungs-ID": r.batchId,
            "Fehlermeldung": r.error || "Kein Fehler",
            "Message-ID": r.messageId || "Keine ID",
            "Zeitpunkt": format(new Date(r.batchTime), "dd.MM.yyyy HH:mm:ss", { locale: de }),
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "E-Mail Verlauf")

        const summary = [
            { "Metrik": "Gesamt E-Mails", "Wert": stats.totalEmails.toString() },
            { "Metrik": "Erfolgreich gesendet", "Wert": stats.totalSuccess.toString() },
            { "Metrik": "Fehlgeschlagen", "Wert": stats.totalFailed.toString() },
            { "Metrik": "Erfolgsrate", "Wert": `${stats.totalEmails > 0 ? ((stats.totalSuccess / stats.totalEmails) * 100).toFixed(1) : 0}%` },
            { "Metrik": "Anzahl Batches", "Wert": stats.totalBatches.toString() },
            { "Metrik": "Export erstellt am", "Wert": format(new Date(), "dd.MM.yyyy HH:mm:ss", { locale: de }) },
        ]
        const wsSummary = XLSX.utils.json_to_sheet(summary)
        XLSX.utils.book_append_sheet(wb, wsSummary, "Zusammenfassung")

        XLSX.writeFile(wb, `ionos-mailer-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`)
    }

    const exportToPDF = async () => {
        const { jsPDF } = await import("jspdf")
        const autoTable = (await import("jspdf-autotable")).default

        const doc = new jsPDF()

        // Header - Black only
        doc.setFontSize(22)
        doc.setTextColor(0, 0, 0)
        doc.text("IONOS Mailer", 20, 20)

        doc.setFontSize(14)
        doc.text("E-Mail Versand-Bericht", 20, 28)

        doc.setFontSize(10)
        doc.setTextColor(80, 80, 80)
        doc.text(`Erstellt am: ${format(new Date(), "dd.MM.yyyy HH:mm:ss", { locale: de })}`, 20, 36)

        // Summary Table
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.text("Zusammenfassung", 20, 50)

        autoTable(doc, {
            startY: 54,
            head: [["Metrik", "Wert"]],
            body: [
                ["Gesamt E-Mails", stats.totalEmails.toString()],
                ["Erfolgreich gesendet", stats.totalSuccess.toString()],
                ["Fehlgeschlagen", stats.totalFailed.toString()],
                ["Erfolgsrate", `${stats.totalEmails > 0 ? ((stats.totalSuccess / stats.totalEmails) * 100).toFixed(1) : 0}%`],
                ["Anzahl Sitzungen", stats.totalBatches.toString()],
            ],
            theme: "plain",
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
            bodyStyles: { textColor: [0, 0, 0] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        })

        // Details Table
        doc.setFontSize(12)
        doc.text("E-Mail Details", 20, (doc as any).lastAutoTable.finalY + 15)

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [["Nr.", "E-Mail Adresse", "Status", "Sitzungs-ID", "Zeitpunkt", "Fehler"]],
            body: allResults.map((r, idx) => [
                (idx + 1).toString(),
                r.email,
                r.success ? "Erfolgreich" : "Fehler",
                r.batchId.substring(0, 8),
                format(new Date(r.batchTime), "dd.MM.yyyy HH:mm", { locale: de }),
                r.error || "-",
            ]),
            theme: "plain",
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 12 },
                1: { cellWidth: 50 },
                2: { cellWidth: 22 },
                3: { cellWidth: 25 },
                4: { cellWidth: 35 },
                5: { cellWidth: 40 },
            },
        })

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(120, 120, 120)
            doc.text(`Seite ${i} von ${pageCount} | IONOS Mailer`, 20, doc.internal.pageSize.height - 10)
        }

        doc.save(`ionos-mailer-bericht-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`)
    }

    if (batches.length === 0) return null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <History className="h-4 w-4" />
                    Verlauf
                    <Badge variant="secondary" className="ml-1">{stats.totalEmails}</Badge>
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[1400px] h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-black dark:bg-white flex items-center justify-center shrink-0">
                            <History className="h-6 w-6 text-white dark:text-black" />
                        </div>
                        <div>
                            <span className="text-2xl font-bold">E-Mail Verlauf & Statistiken</span>
                            <p className="text-sm text-muted-foreground font-normal">Alle gesendeten E-Mails dieser Sitzung</p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Gesamt", value: stats.totalEmails, icon: Mail },
                            { label: "Erfolgreich", value: stats.totalSuccess, icon: CheckCircle, color: "text-green-600" },
                            { label: "Fehlgeschlagen", value: stats.totalFailed, icon: XCircle, color: "text-red-600" },
                            { label: "Sitzungen", value: stats.totalBatches, icon: Send },
                        ].map((stat) => (
                            <Card key={stat.label} className="border-neutral-200 dark:border-neutral-800">
                                <CardContent className="p-4">
                                    <stat.icon className={`h-5 w-5 mb-2 ${stat.color || "text-neutral-600"}`} />
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card className="border-neutral-200 dark:border-neutral-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    Erfolgsrate
                                    <span className="ml-auto text-xl font-bold">
                                        {stats.totalEmails > 0 ? ((stats.totalSuccess / stats.totalEmails) * 100).toFixed(1) : 0}%
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                                                <Cell fill="#000" />
                                                <Cell fill="#d4d4d4" />
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-neutral-200 dark:border-neutral-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <History className="h-4 w-4" />
                                    Versand-Verlauf
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={areaData}>
                                            <defs>
                                                <linearGradient id="colorSuccess2" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#000" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#000" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                            <XAxis dataKey="name" fontSize={10} stroke="#737373" />
                                            <YAxis fontSize={10} stroke="#737373" />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="Erfolgreich" stroke="#000" fillOpacity={1} fill="url(#colorSuccess2)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Search className="h-4 w-4 text-neutral-500" />
                            <Input
                                placeholder="E-Mail suchen..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-9"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                            <SelectTrigger className="w-[160px] h-9">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Status</SelectItem>
                                <SelectItem value="success">Erfolgreich</SelectItem>
                                <SelectItem value="failed">Fehlgeschlagen</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2 ml-auto">
                            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Excel
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                                <FileText className="h-4 w-4" />
                                PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={onClearAll} className="gap-2 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                                Löschen
                            </Button>
                        </div>
                    </div>

                    {/* Results Table */}
                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">
                                Alle E-Mails ({allResults.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-neutral-50 dark:bg-neutral-900">
                                            <TableHead className="font-semibold w-[50px]">Nr.</TableHead>
                                            <TableHead className="font-semibold">E-Mail Adresse</TableHead>
                                            <TableHead className="font-semibold">Status</TableHead>
                                            <TableHead className="font-semibold">Sitzungs-ID</TableHead>
                                            <TableHead className="font-semibold">Zeitpunkt</TableHead>
                                            <TableHead className="font-semibold">Message-ID</TableHead>
                                            <TableHead className="font-semibold">Fehler</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allResults.map((result, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                                <TableCell className="font-medium">{result.email}</TableCell>
                                                <TableCell>
                                                    {result.success ? (
                                                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Gesendet
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Fehler
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{result.batchId}</TableCell>
                                                <TableCell className="text-sm">
                                                    {format(new Date(result.batchTime), "dd.MM.yyyy HH:mm:ss", { locale: de })}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate" title={result.messageId || undefined}>
                                                    {result.messageId || "—"}
                                                </TableCell>
                                                <TableCell className="text-sm text-red-600 max-w-[150px]" title={result.error || undefined}>
                                                    {result.error || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-neutral-400 hover:text-red-500"
                                                        onClick={() => onDeleteBatch(result.batchId)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    )
}
