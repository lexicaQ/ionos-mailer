"use client"

import { SendResult } from "@/lib/schemas"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Clock, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { exportHistoryToCsv } from "@/lib/export-utils"

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
    if (batches.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight">Verlauf</h3>
            <Accordion type="single" collapsible className="w-full">
                {batches.slice().reverse().map((batch) => (
                    <AccordionItem key={batch.id} value={batch.id}>
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="font-mono text-muted-foreground">{new Date(batch.timestamp).toLocaleTimeString()}</span>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/10">
                                            {batch.success} Erfolgreich
                                        </Badge>
                                        {batch.failed > 0 && (
                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-900/10">
                                                {batch.failed} Fehlgeschlagen
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        exportHistoryToCsv(batch);
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    CSV Export
                                </Button>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="pt-2 pb-4">
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
                                                        <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                                                            <CheckCircle className="h-4 w-4" />
                                                            <span>Gesendet</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                                                            <XCircle className="h-4 w-4" />
                                                            <span>Fehler</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {result.error || result.messageId || "-"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    )
}
