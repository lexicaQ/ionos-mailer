"use client"

import { useState } from "react"
import { SendResult } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Download, ChevronDown, ChevronUp, Mail, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportHistoryToCsv } from "@/lib/export-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface HistoryBatch {
    id: string
    timestamp: string
    results: SendResult[]
    total: number
    success: number
    failed: number
}

interface HistoryListProps {
    batches: HistoryBatch[]
}

export function HistoryList({ batches }: HistoryListProps) {
    const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

    if (batches.length === 0) return null;

    const toggleBatch = (id: string) => {
        setExpandedBatch(expandedBatch === id ? null : id);
    }

    return (
        <Card className="border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Sofort-Versand Verlauf
                    </CardTitle>
                    <Badge variant="outline">{batches.length} Batches</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {batches.slice().reverse().map((batch) => (
                    <div key={batch.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleBatch(batch.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                        >
                            <div className="flex items-center gap-4 text-sm">
                                <div className="text-left">
                                    <p className="font-mono text-muted-foreground">
                                        {new Date(batch.timestamp).toLocaleDateString('de-DE')} • {new Date(batch.timestamp).toLocaleTimeString('de-DE')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        ID: {batch.id.slice(0, 8)}...
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {batch.success} erfolgreich
                                    </Badge>
                                    {batch.failed > 0 && (
                                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20">
                                            <XCircle className="h-3 w-3 mr-1" />
                                            {batch.failed} fehlgeschlagen
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        exportHistoryToCsv(batch);
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    CSV
                                </Button>
                                {expandedBatch === batch.id ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                        </button>

                        {expandedBatch === batch.id && (
                            <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">Status</TableHead>
                                            <TableHead>E-Mail Adresse</TableHead>
                                            <TableHead>Message-ID</TableHead>
                                            <TableHead>Fehlerdetails</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {batch.results.map((result, idx) => (
                                            <TableRow key={idx} className="hover:bg-white dark:hover:bg-neutral-800/50">
                                                <TableCell>
                                                    {result.success ? (
                                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-red-600" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {result.email}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {result.messageId || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {result.error ? (
                                                        <div className="flex items-start gap-2 max-w-md">
                                                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                            <span className="text-sm text-red-600 dark:text-red-400 break-words">
                                                                {result.error}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
