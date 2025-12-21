import { SendResult } from "@/lib/schemas"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock } from "lucide-react"

interface StatusViewProps {
    isSending: boolean
    progress: number
    results: SendResult[]
}

export function StatusView({ isSending, progress, results }: StatusViewProps) {
    if (results.length === 0 && !isSending) return null;

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {isSending && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Sending Emails...</span>
                        <span>{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {!isSending && results.length > 0 && (
                <div className="flex gap-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-medium">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500">
                        <Clock className="h-5 w-5" />
                        {successful} Scheduled for Cron
                    </div>
                </div>
            )}

            {results.length > 0 && (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.slice().reverse().map((result, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium">{result.email}</TableCell>
                                    <TableCell>
                                        {result.success ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                                Queued
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800">
                                                Failed
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {new Date(result.timestamp).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground font-mono">
                                        {result.error ? result.error : (result.messageId ? `#${result.messageId.replace(/[<>]/g, '').split('@')[0].split('-').pop()}` : "-")}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
