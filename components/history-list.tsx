"use client"

import { useState } from "react"
import { SendResult } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Download, ChevronDown, ChevronUp } from "lucide-react"
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
                <CardTitle className="text-lg">Verlauf</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {batches.slice().reverse().map((batch) => (
                    <div key={batch.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleBatch(batch.id)}
                            className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                        >
                            <div className="flex items-center gap-4 text-sm">
                                <span className="font-mono text-muted-foreground">
                                    {new Date(batch.timestamp).toLocaleTimeString()}
                                </span>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20">
                                        {batch.success} ✓
                                    </Badge>
                                    {batch.failed > 0 && (
                                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20">
                                            {batch.failed} ✗
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        exportHistoryToCsv(batch);
                                    }}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                {expandedBatch === batch.id ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                        </button>
                        
                        {expandedBatch === batch.id && (
                            <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/50">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Empfänger</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {batch.results.map((result, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{result.email}</TableCell>
                                                <TableCell>
                                                    {result.success ? (
                                                        <div className="flex items-center gap-2 text-green-600">
                                                            <CheckCircle className="h-4 w-4" />
                                                            <span>Gesendet</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-red-600">
                                                            <XCircle className="h-4 w-4" />
                                                            <span>Fehler</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                                    {result.error || result.messageId || "-"}
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
