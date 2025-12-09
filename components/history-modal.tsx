"use client"

import { useState, useMemo } from "react"
import { SendResult } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { 
    CheckCircle, XCircle, Download, Trash2, Filter, 
    FileSpreadsheet, FileText, BarChart3, Search, X as XIcon,
    Calendar, Mail, Clock
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

const COLORS = ["#22c55e", "#ef4444"]

export function HistoryModal({ batches, onDeleteBatch, onClearAll }: HistoryModalProps) {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all")
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null)

    // Aggregate stats
    const stats = useMemo(() => {
        const totalEmails = batches.reduce((sum, b) => sum + b.total, 0)
        const totalSuccess = batches.reduce((sum, b) => sum + b.success, 0)
        const totalFailed = batches.reduce((sum, b) => sum + b.failed, 0)
        return { totalEmails, totalSuccess, totalFailed, totalBatches: batches.length }
    }, [batches])

    // Chart data
    const pieData = [
        { name: "Erfolgreich", value: stats.totalSuccess },
        { name: "Fehlgeschlagen", value: stats.totalFailed },
    ]

    const barData = batches.slice(-7).map(b => ({
        name: format(new Date(b.timestamp), "dd.MM", { locale: de }),
        Erfolgreich: b.success,
        Fehlgeschlagen: b.failed,
    }))

    // Filtered results
    const filteredBatches = useMemo(() => {
        return batches.filter(batch => {
            if (selectedBatch && batch.id !== selectedBatch) return false
            const matchesSearch = batch.results.some(r => 
                r.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
            if (searchTerm && !matchesSearch) return false
            return true
        })
    }, [batches, searchTerm, selectedBatch])

    const allResults = useMemo(() => {
        let results: (SendResult & { batchId: string; batchTime: string })[] = []
        filteredBatches.forEach(batch => {
            batch.results.forEach(r => {
                results.push({ ...r, batchId: batch.id, batchTime: batch.timestamp })
            })
        })
        if (statusFilter === "success") {
            results = results.filter(r => r.success)
        } else if (statusFilter === "failed") {
            results = results.filter(r => !r.success)
        }
        return results
    }, [filteredBatches, statusFilter])

    // Export functions
    const exportToExcel = async () => {
        const XLSX = await import("xlsx")
        const data = allResults.map(r => ({
            "E-Mail": r.email,
            "Status": r.success ? "Erfolgreich" : "Fehlgeschlagen",
            "Fehler": r.error || "-",
            "Message-ID": r.messageId || "-",
            "Zeitpunkt": format(new Date(r.batchTime), "dd.MM.yyyy HH:mm", { locale: de }),
        }))
        
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "E-Mail Verlauf")
        
        // Add summary sheet
        const summary = [
            { "Metrik": "Gesamt E-Mails", "Wert": stats.totalEmails },
            { "Metrik": "Erfolgreich", "Wert": stats.totalSuccess },
            { "Metrik": "Fehlgeschlagen", "Wert": stats.totalFailed },
            { "Metrik": "Erfolgsrate", "Wert": `${((stats.totalSuccess / stats.totalEmails) * 100).toFixed(1)}%` },
        ]
        const wsSummary = XLSX.utils.json_to_sheet(summary)
        XLSX.utils.book_append_sheet(wb, wsSummary, "Zusammenfassung")
        
        XLSX.writeFile(wb, `ionos-mailer-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`)
    }

    const exportToPDF = async () => {
        const { jsPDF } = await import("jspdf")
        const autoTable = (await import("jspdf-autotable")).default
        
        const doc = new jsPDF()
        
        // Header
        doc.setFontSize(20)
        doc.setTextColor(79, 70, 229)
        doc.text("IONOS Mailer - E-Mail Bericht", 20, 20)
        
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(`Erstellt am: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`, 20, 28)
        
        // Summary
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.text("Zusammenfassung", 20, 42)
        
        autoTable(doc, {
            startY: 46,
            head: [["Metrik", "Wert"]],
            body: [
                ["Gesamt E-Mails", stats.totalEmails.toString()],
                ["Erfolgreich", stats.totalSuccess.toString()],
                ["Fehlgeschlagen", stats.totalFailed.toString()],
                ["Erfolgsrate", `${((stats.totalSuccess / stats.totalEmails) * 100).toFixed(1)}%`],
            ],
            theme: "striped",
            headStyles: { fillColor: [79, 70, 229] },
        })
        
        // Details
        doc.setFontSize(14)
        doc.text("E-Mail Details", 20, (doc as any).lastAutoTable.finalY + 15)
        
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [["E-Mail", "Status", "Zeitpunkt"]],
            body: allResults.slice(0, 50).map(r => [
                r.email,
                r.success ? "✓ Erfolgreich" : "✗ Fehler",
                format(new Date(r.batchTime), "dd.MM.yyyy HH:mm", { locale: de }),
            ]),
            theme: "striped",
            headStyles: { fillColor: [79, 70, 229] },
        })
        
        doc.save(`ionos-mailer-bericht-${format(new Date(), "yyyy-MM-dd")}.pdf`)
    }

    if (batches.length === 0) return null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Verlauf & Statistiken
                    <Badge variant="secondary" className="ml-1">{stats.totalEmails}</Badge>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl min-h-[85vh] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-white" />
                        </div>
                        E-Mail Verlauf & Statistiken
                    </DialogTitle>
                </DialogHeader>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {[
                        { label: "Gesamt", value: stats.totalEmails, icon: Mail, color: "from-blue-500 to-cyan-500" },
                        { label: "Erfolgreich", value: stats.totalSuccess, icon: CheckCircle, color: "from-green-500 to-emerald-500" },
                        { label: "Fehlgeschlagen", value: stats.totalFailed, icon: XCircle, color: "from-red-500 to-rose-500" },
                        { label: "Kampagnen", value: stats.totalBatches, icon: Clock, color: "from-purple-500 to-pink-500" },
                    ].map((stat) => (
                        <div key={stat.label} className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-4 shadow-sm">
                            <div className={`absolute top-0 right-0 h-16 w-16 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full`} />
                            <stat.icon className="h-5 w-5 text-slate-500 mb-2" />
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 shadow-sm">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Erfolgsverteilung
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 shadow-sm">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Letzte 7 Kampagnen
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="Erfolgreich" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Fehlgeschlagen" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-wrap items-center gap-3 mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search className="h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="E-Mail suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                        <SelectTrigger className="w-[150px] h-9">
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
                        <Button variant="destructive" size="sm" onClick={onClearAll} className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Alle löschen
                        </Button>
                    </div>
                </div>

                {/* Results Table */}
                <div className="rounded-xl border overflow-hidden mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-800">
                                <TableHead>E-Mail</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Kampagne-ID</TableHead>
                                <TableHead>Zeitpunkt</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allResults.slice(0, 100).map((result, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                    <TableCell className="font-medium">{result.email}</TableCell>
                                    <TableCell>
                                        {result.success ? (
                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Gesendet
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Fehler
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-slate-500">
                                        {result.batchId.slice(0, 8)}...
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                        {format(new Date(result.batchTime), "dd.MM.yyyy HH:mm", { locale: de })}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                                        {result.error || result.messageId || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-slate-400 hover:text-red-500"
                                            onClick={() => onDeleteBatch(result.batchId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {allResults.length > 100 && (
                        <div className="text-center py-3 text-sm text-slate-500 bg-slate-50 dark:bg-slate-800">
                            ... und {allResults.length - 100} weitere Einträge
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
