"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Activity, CheckCircle, XCircle, Clock, Mail,
    RefreshCw, Zap, Trash2, Search, FileSpreadsheet, FileText
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

interface EmailJob {
    id: string
    recipient: string
    subject: string
    status: "PENDING" | "SENT" | "FAILED"
    scheduledFor: string
    sentAt: string | null
    error: string | null
    openedAt: string | null
}

interface Campaign {
    id: string
    createdAt: string
    name?: string | null
    jobs: EmailJob[]
    stats: {
        total: number
        sent: number
        pending: number
        failed: number
        opened: number
        clicked: number
    }
}

export function LiveCampaignTracker() {
    const [open, setOpen] = useState(false)
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(false)
    const [isAutoProcessing, setIsAutoProcessing] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Retrieve campaigns
    const filteredCampaigns = campaigns.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.jobs.some(j => j.recipient.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // FETCH CAMPAIGNS
    const fetchCampaigns = useCallback(async () => {
        setLoading(true)
        try {
            const userId = localStorage.getItem("ionos-mailer-user-id");
            const res = await fetch("/api/campaigns/status", {
                headers: { 'x-user-id': userId || '' }
            })
            if (res.ok) {
                const data = await res.json()
                // Sort by date DESCENDING (Newest First -> #1)
                data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                // Sort jobs chronologically (Ascending: First scheduled -> Last scheduled)
                data.forEach((c: any) => {
                    if (c.jobs) {
                        c.jobs.sort((a: any, b: any) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
                    }
                });

                setCampaigns(data)
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    const campaignsRef = useRef<Campaign[]>([]);

    // Keep ref in sync for the interval
    useEffect(() => {
        campaignsRef.current = campaigns;
    }, [campaigns]);



    // Separate Effect for Intervals to avoid resetting timer when campaigns update
    useEffect(() => {
        // Initial fetch
        fetchCampaigns();

        // 1. Refresh Data Interval
        const refreshInterval = setInterval(() => {
            if (open) fetchCampaigns();
            else if (Math.random() > 0.4) fetchCampaigns(); // Probabilistic throttling ~5-6s
        }, 3000);

        // 2. Auto-Process trigger (Acts as a backup cron while UI is open)
        const processInterval = setInterval(() => {
            const currentCampaigns = campaignsRef.current;
            const hasPending = currentCampaigns.some(c => c.stats.pending > 0);

            if (hasPending) {
                // console.log("Frontend Cron: Triggering processing...");
                setIsAutoProcessing(true);
                fetch('/api/cron/process', {
                    method: 'GET',
                    headers: { 'x-manual-trigger': 'true' }
                }).catch(e => console.error("Auto-process failed", e))
                    .finally(() => {
                        setTimeout(() => setIsAutoProcessing(false), 2000);
                    });
            }
        }, 10000); // Trigger every 10s

        return () => {
            clearInterval(refreshInterval);
            clearInterval(processInterval);
        }
    }, [open, fetchCampaigns]);

    useEffect(() => {
        if (open) fetchCampaigns();
    }, [open, fetchCampaigns]);


    const deleteCampaign = async (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (!confirm("Do you really want to delete the campaign? Sending will be stopped immediately.")) return;

        try {
            // Optimistic update
            setCampaigns(prev => prev.filter(c => c.id !== id));

            const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
            if (!res.ok) {
                console.error("Deletion failed on server");
                fetchCampaigns();
            }
        } catch (e) { console.error(e); }
    }

    // EXPORT FUNCTIONS
    const exportToExcel = async () => {
        const XLSX = await import("xlsx")
        const data: any[] = []

        campaigns.forEach(c => {
            c.jobs.forEach(j => {
                data.push({
                    "Campaign": c.name || "Untitled",
                    "Created at": format(new Date(c.createdAt), "yyyy-MM-dd HH:mm"),
                    "Recipient": j.recipient,
                    "Subject": j.subject,
                    "Status": j.status,
                    "Opened": j.openedAt ? `Yes (${format(new Date(j.openedAt), "MMM dd HH:mm")})` : "No",
                    "Sent at": j.sentAt ? format(new Date(j.sentAt), "MMM dd HH:mm:ss") : "-",
                    "Error": j.error || ""
                })
            })
        })

        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Campaign Export")
        XLSX.writeFile(wb, `ionos-mailer-live-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`)
    }

    const exportToPDF = async () => {
        const { jsPDF } = await import("jspdf")
        const autoTable = (await import("jspdf-autotable")).default

        const doc = new jsPDF({ orientation: "landscape" })
        doc.setFontSize(18)
        doc.text("IONOS Mailer - Campaign Report", 14, 22)
        doc.setFontSize(10)
        doc.text(`Created: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 30)

        const rows: any[] = []
        campaigns.forEach(c => {
            c.jobs.forEach(j => {
                rows.push([
                    c.name || "Untitled",
                    j.recipient,
                    j.status,
                    j.openedAt ? "Yes" : "No",
                    j.sentAt ? format(new Date(j.sentAt), "MMM dd HH:mm") : "-",
                    j.error ? "Yes" : "-"
                ])
            })
        })

        autoTable(doc, {
            head: [["Campaign", "Recipient", "Status", "Opened", "Sent", "Error"]],
            body: rows,
            startY: 40,
        })

        doc.save(`ionos-mailer-live-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`)
    }

    const activeCampaigns = campaigns.filter(c => c.stats.pending > 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                    <Activity className="h-4 w-4" />
                    Live Tracking
                    {activeCampaigns.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-black dark:bg-white rounded-full animate-pulse" />
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-neutral-950 rounded-lg border shadow-lg text-foreground">

                {/* Header */}
                <div className="flex flex-col border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                                <Activity className="h-5 w-5 text-white dark:text-black" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">Live Campaign Tracking</h2>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    {isAutoProcessing ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                            <RefreshCw className="h-3 w-3 animate-spin" /> Processing background jobs...
                                        </span>
                                    ) : (
                                        <span>System ready • Last update: {format(new Date(), "HH:mm:ss")}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={exportToExcel} disabled={campaigns.length === 0} className="hidden sm:flex gap-2 h-8 text-xs">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Excel
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportToPDF} disabled={campaigns.length === 0} className="hidden sm:flex gap-2 h-8 text-xs">
                                <FileText className="h-3.5 w-3.5" />
                                PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading} className="gap-2">
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="px-6 pb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search campaign, recipients..."
                                className="pl-9 bg-neutral-50 dark:bg-neutral-800 border-none"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-neutral-50/50 dark:bg-black/20">
                    {filteredCampaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <Mail className="h-12 w-12 opacity-20 mb-4" />
                            <p>No campaigns found</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-5xl mx-auto">
                            {/* Single Unified List - Chronological (Newest Top -> Oldest Bottom) */}
                            {filteredCampaigns.map((c, idx) => (
                                <MinimalCampaignRow
                                    key={c.id}
                                    campaign={c}
                                    index={filteredCampaigns.length - idx} // Reverse index so newest is highest number? Or just 1, 2, 3? User said "5, 4, 3...".
                                    // If sort is Newest First (Top), then idx 0 is the newest. If we want 5 (newest), then we should use length - idx.
                                    displayIndex={filteredCampaigns.length - idx}
                                    onDelete={(e) => deleteCampaign(c.id, e)}
                                />
                            ))}
                            {/* Anchor to scroll to bottom if needed in future */}
                            <div className="h-px" />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function MinimalCampaignRow({ campaign, index, displayIndex, onDelete }: { campaign: Campaign, index?: number, displayIndex: number, onDelete: (e: React.MouseEvent) => void }) {
    const [isOpen, setIsOpen] = useState(true);
    const progress = campaign.stats.total > 0
        ? ((campaign.stats.sent + campaign.stats.failed) / campaign.stats.total) * 100
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm"
        >
            {/* Campaign Header */}
            <div
                className="bg-neutral-50/50 dark:bg-neutral-900/50 p-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-4">
                    {/* Chevron */}
                    <div className={`transition-transform duration-200 text-neutral-400 ${isOpen ? 'rotate-180' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>

                    <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        #{displayIndex}
                    </div>
                    <div>
                        <div className="text-base font-semibold flex items-center gap-2">
                            {campaign.name ? (
                                <span>
                                    {campaign.name} <span className="text-muted-foreground font-normal text-sm">({format(new Date(campaign.createdAt), "yyyy-MM-dd HH:mm")})</span>
                                </span>
                            ) : (
                                <span>Campaign <span className="text-muted-foreground font-normal text-sm">from {format(new Date(campaign.createdAt), "yyyy-MM-dd HH:mm")}</span></span>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">{progress.toFixed(0)}% Finished</span>
                            <span className="h-1 w-1 bg-neutral-300 rounded-full" />
                            <span>{campaign.stats.sent} Sent</span>
                            <span className="h-1 w-1 bg-neutral-300 rounded-full" />
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                <span className={campaign.stats.opened > 0 ? "animate-pulse h-1.5 w-1.5 rounded-full bg-green-500" : ""} />
                                {campaign.stats.opened} Opened
                            </span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8 px-2 p-0 z-10 gap-1 text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                </Button>
            </div>

            {/* Email List - Minimalist Table */}
            {isOpen && (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="bg-neutral-50/30 dark:bg-neutral-900/30 px-4 py-2 flex text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <div className="w-[100px]">Status</div>
                        <div className="w-[110px]">Opened</div>
                        <div className="flex-1">Recipient / Subject</div>
                        <div className="w-[140px] text-right">Time</div>
                    </div>
                    {campaign.jobs.map((job) => (
                        <div key={job.id} className="p-3 px-4 flex items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-sm gap-4">

                            {/* Status Pill - FIRST */}
                            <div className="w-[100px] flex-shrink-0">
                                <Badge
                                    variant={job.status === 'SENT' ? 'default' : 'secondary'}
                                    className={`
                                        h-6 px-0 text-[10px] border-0 font-bold tracking-wide w-[90px] justify-center shadow-none
                                        ${job.status === 'SENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100' :
                                            job.status === 'FAILED' ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' :
                                                'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-100'}
                                    `}
                                >
                                    {job.status === 'SENT' ? 'SENT' :
                                        job.status === 'FAILED' ? 'FAILED' :
                                            'WAITING'}
                                </Badge>
                            </div>

                            {/* Opened Status - SECOND */}
                            <div className="w-[110px] flex-shrink-0">
                                {job.openedAt ? (
                                    <div className="flex flex-col">
                                        <div className="text-green-600 dark:text-green-500 font-bold text-sm tracking-wide">
                                            {format(new Date(job.openedAt), "HH:mm")}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground pl-1 opacity-50">—</span>
                                )}
                            </div>

                            {/* Recipient - THIRD */}
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={job.recipient}>
                                    {job.recipient}
                                </div>
                                <div className="text-xs text-muted-foreground truncate opacity-80" title={job.subject}>{job.subject}</div>
                            </div>

                            {/* Times - LAST */}
                            <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground flex-shrink-0 w-[140px]">
                                <div className="text-right">
                                    <div className="uppercase text-[9px] tracking-wider opacity-50 mb-0.5">Scheduled</div>
                                    <div className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{format(new Date(job.scheduledFor), "HH:mm")}</div>
                                </div>

                                {job.sentAt && (
                                    <div className="text-right">
                                        <div className="uppercase text-[9px] tracking-wider opacity-50 mb-0.5">Sent</div>
                                        <div className="font-mono text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                            {format(new Date(job.sentAt), "HH:mm")}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    )
}
