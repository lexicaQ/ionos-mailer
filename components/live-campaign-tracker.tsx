"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SecurityLoader } from "@/components/security-loader"
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
    Activity, CheckCircle2, AlertTriangle, XCircle, Clock, Trash2, StopCircle, RefreshCw, FileSpreadsheet, FileText, X, Search, Mail
} from 'lucide-react'
import { Input } from "@/components/ui/input"
import { format, formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface EmailJob {
    id: string
    recipient: string
    subject: string
    status: "PENDING" | "SENT" | "FAILED" | "CANCELLED"
    scheduledFor: string
    originalScheduledFor?: string | null
    sentAt: string | null
    error: string | null
    openedAt: string | null
    ipAddress?: string | null
    sentViaCron?: boolean
}

interface Campaign {
    id: string
    createdAt: string
    name?: string | null
    isDirect?: boolean
    jobs: EmailJob[]
    stats: {
        total: number
        sent: number
        pending: number
        failed: number
        opened: number
    }
}

export function LiveCampaignTracker() {
    const [open, setOpen] = useState(false)
    const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem("ionos-mailer-campaigns-cache");
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    console.error("Cache parse failed", e);
                }
            }
        }
        return [];
    })
    const [loading, setLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false) // Visual indicator for background sync
    const [isAutoProcessing, setIsAutoProcessing] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const deletedCampaigns = useRef<Set<string>>(new Set())

    // Retrieve campaigns
    const filteredCampaigns = campaigns.filter(c =>
        !c.isDirect && (
            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.jobs.some(j => j.recipient.toLowerCase().includes(searchTerm.toLowerCase()))
        )
    );

    // Data Migration (One-time check for orphaned data)
    useEffect(() => {
        const migrateData = async () => {
            const oldId = localStorage.getItem("ionos-mailer-user-id");
            if (oldId) {
                try {
                    const res = await fetch('/api/migrate', {
                        method: 'POST',
                        body: JSON.stringify({ oldUserId: oldId })
                    });
                    if (res.ok) {
                        localStorage.removeItem("ionos-mailer-user-id");
                        // Delay slighty to allow DB propagation then refresh
                        setTimeout(() => fetchCampaigns(), 500);
                    }
                } catch (e) {
                    console.error("Migration failed", e);
                }
            }
        };
        migrateData();

        // Load deleted campaign IDs ONCE on mount
        const deletedIds = localStorage.getItem("ionos-mailer-deleted-campaigns");
        if (deletedIds) {
            try {
                const parsed: string[] = JSON.parse(deletedIds);
                parsed.forEach(id => deletedCampaigns.current.add(id));
            } catch (e) { }
        }
    }, []); // Run once on mount

    const isFetching = useRef(false);

    // FETCH CAMPAIGNS - INSTANT CACHE DISPLAY (LIKE HISTORY)
    const fetchCampaigns = useCallback(async (isBackground = false) => {
        // Prevent concurrent fetches
        if (isFetching.current) {
            console.log('Fetch already in progress, skipping...');
            return;
        }

        isFetching.current = true;

        // Track if this is the very first sync (to show animation once)
        const hasInitialData = campaignsRef.current.length > 0;

        try {
            // 1. INSTANT CACHE LOAD FIRST (synchronous, before any async operations)
            if (!isBackground) {
                const cached = localStorage.getItem("ionos-mailer-campaigns-cache");
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const filtered = parsed.filter((c: any) => !deletedCampaigns.current.has(c.id));
                        setCampaigns(filtered); // Instant display!
                    } catch (e) {
                        console.error('Cache parse failed:', e);
                    }
                }
            }

            // 2. Only set loading if NO cached data exists (first time ever)
            if (!isBackground && !localStorage.getItem("ionos-mailer-campaigns-cache")) {
                setLoading(true);
            }

            // 3. Fetch fresh data from server in background
            const res = await fetch("/api/campaigns/status");
            if (res.ok) {
                const data = await res.json();
                // Sort by date DESCENDING (Newest First -> #1)
                data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                // Sort jobs chronologically (Ascending: First scheduled -> Last scheduled)
                data.forEach((c: any) => {
                    if (c.jobs) {
                        c.jobs.sort((a: any, b: any) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
                    }
                });

                // Filter out deleted campaigns
                const filtered = data.filter((c: any) => !deletedCampaigns.current.has(c.id));

                // Only show sync indicator and update if data actually changed
                const currentDataString = JSON.stringify(campaignsRef.current);
                const newDataString = JSON.stringify(filtered);
                const hasChanges = currentDataString !== newDataString;

                if (hasChanges || !hasInitialData) {
                    // Show sync indicator only if:
                    // 1. Real changes detected OR
                    // 2. First time loading (no initial data)
                    if (hasChanges && hasInitialData) {
                        setIsSyncing(true);
                        setTimeout(() => setIsSyncing(false), 500);
                    }

                    setCampaigns(filtered);
                    // Update cache WITHOUT deleted campaigns
                    localStorage.setItem("ionos-mailer-campaigns-cache", JSON.stringify(filtered));
                }
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, []);

    const campaignsRef = useRef<Campaign[]>([]);

    // Keep ref in sync for the interval
    useEffect(() => {
        campaignsRef.current = campaigns;
    }, [campaigns]);



    // Separate Effect for Intervals to avoid resetting timer when campaigns update
    useEffect(() => {
        // Initial fetch
        fetchCampaigns(false);

        // Debounce handler for creation events (prevent multiple rapid calls)
        let debounceTimer: NodeJS.Timeout | null = null;
        const handleCreation = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchCampaigns(true);
            }, 50); // Almost instant update
        };
        window.addEventListener('campaign-created', handleCreation);

        // SMART POLLING: Only when necessary (replaces 1s ultra-fast polling)
        let pollInterval: NodeJS.Timeout | null = null;

        const shouldPoll = () => {
            // Only poll if:
            // 1. Modal is open
            // 2. There are active campaigns (pending emails)
            // 3. Browser tab is visible
            const hasActiveCampaigns = activeCampaigns.length > 0;
            const isVisible = document.visibilityState === 'visible';
            return open && hasActiveCampaigns && isVisible;
        };

        const startPolling = () => {
            if (pollInterval) return; // Already polling

            if (shouldPoll()) {
                // Modified to 5s as requested (User accepted this is only active when jobs are pending)
                pollInterval = setInterval(() => {
                    if (shouldPoll()) {
                        fetchCampaigns(true);
                    } else {
                        stopPolling(); // Stop if conditions no longer met
                    }
                }, 5000); // 5 seconds
            }
        };

        const stopPolling = () => {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        };

        // Browser visibility change handler
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling(); // Pause when tab inactive
            } else if (open) {
                fetchCampaigns(true); // Refresh on tab activation
                startPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Start polling if conditions are met
        startPolling();

        // NOTE: Auto-process trigger REMOVED to reduce Fluid Active CPU usage
        // Email processing is now handled ONLY by external cron-job.org (1x/minute)
        // or manual "Start Cron" button in Settings

        return () => {
            window.removeEventListener('campaign-created', handleCreation);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopPolling();
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [fetchCampaigns, open, campaigns]);

    useEffect(() => {
        if (open) fetchCampaigns(false);
    }, [open, fetchCampaigns]);


    const deleteCampaign = async (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (!confirm("Do you really want to delete the campaign? Sending will be stopped immediately.")) return;

        // Optimistic Deletion
        deletedCampaigns.current.add(id);
        setCampaigns(prev => prev.filter(c => c.id !== id));

        // Persist deleted IDs to localStorage
        const deletedIds = Array.from(deletedCampaigns.current);
        localStorage.setItem("ionos-mailer-deleted-campaigns", JSON.stringify(deletedIds));

        // Also remove from cache immediately
        const cached = localStorage.getItem("ionos-mailer-campaigns-cache");
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const filtered = parsed.filter((c: any) => c.id !== id);
                localStorage.setItem("ionos-mailer-campaigns-cache", JSON.stringify(filtered));
            } catch (e) { }
        }

        try {
            const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });

            if (!res.ok) {
                // Only revert if we are certain it's a permission/logic error (401, 403, 404)
                // If it's a 500 or 504 (Timeout), we assume the server is processing it in background
                if (res.status === 401 || res.status === 403) {
                    console.error("Deletion denied");
                    deletedCampaigns.current.delete(id);
                    // Update persisted list
                    const updatedIds = Array.from(deletedCampaigns.current);
                    localStorage.setItem("ionos-mailer-deleted-campaigns", JSON.stringify(updatedIds));
                    fetchCampaigns(false); // Reload to restore
                    alert("Permission denied. You cannot delete this campaign.");
                } else if (res.status === 404) {
                    // Already gone, do nothing (keep hidden)
                } else {
                    // 500 or others: Likely timeout due to large data. Keep hidden.
                    console.warn("Deletion slow or server error, assuming background processing:", res.status);
                    toast.warning("Deletion is taking longer than expected", {
                        description: "It will be processed in the background."
                    });
                }
            }
        } catch (e) {
            console.error("Deletion network error", e);
            // Network error (timeout?): Keep hidden, assume background or future retry
            toast.warning("Network delay during deletion", {
                description: "The campaign will be removed shortly."
            });
        }
    }

    const cancelJob = async (campaignId: string, jobId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        if (!confirm("Cancel this email?")) return;

        // Optimistic Update
        setCampaigns(prev => prev.map(c => {
            if (c.id === campaignId) {
                return {
                    ...c,
                    jobs: c.jobs.map(j => {
                        if (j.id === jobId) {
                            return { ...j, status: "CANCELLED" as const };
                        }
                        return j;
                    }),
                    stats: {
                        ...c.stats,
                        pending: Math.max(0, c.stats.pending - 1)
                    }
                };
            }
            return c;
        }));

        try {
            await fetch(`/api/jobs/${jobId}/cancel`, { method: "PATCH" });
        } catch (error) {
            console.error("Failed to cancel job", error);
            // Revert would be complex here, assuming success for "instant" feel users want
            toast.error("Failed to cancel on server. It may send.");
        }
    };

    // EXPORT FUNCTIONS
    const exportToExcel = async () => {
        const ExcelJS = await import("exceljs")
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Campaign Export");

        sheet.columns = [
            { header: "Campaign", key: "campaign", width: 25 },
            { header: "Created at", key: "created", width: 20 },
            { header: "Recipient", key: "recipient", width: 30 },
            { header: "Subject", key: "subject", width: 40 },
            { header: "Status", key: "status", width: 15 },
            { header: "Opened", key: "opened", width: 25 },
            { header: "Sent at", key: "sentAt", width: 20 },
            { header: "Error", key: "error", width: 30 },
        ];

        campaigns.forEach(c => {
            c.jobs.forEach(j => {
                sheet.addRow({
                    campaign: c.name || "Untitled",
                    created: format(new Date(c.createdAt), "yyyy-MM-dd HH:mm"),
                    recipient: j.recipient,
                    subject: j.subject,
                    status: j.status,
                    opened: j.openedAt ? `Yes (${format(new Date(j.openedAt), "MMM dd HH:mm")})` : "No",
                    sentAt: j.sentAt ? format(new Date(j.sentAt), "MMM dd HH:mm:ss") : "-",
                    error: j.error || ""
                });
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ionos-mailer-live-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
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
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
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
            <DialogContent showCloseButton={false} onOpenAutoFocus={(e) => e.preventDefault()} className="sm:max-w-[800px] max-h-[80vh] sm:max-h-[90vh] mt-8 sm:mt-0 flex flex-col p-0 overflow-hidden bg-white dark:bg-neutral-950 rounded-lg border shadow-lg text-foreground">

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
                                    {(isAutoProcessing || isSyncing) ? (
                                        <span className="text-green-600 flex items-center gap-1">
                                            <RefreshCw className="h-3 w-3 animate-spin" /> {isSyncing ? "Syncing..." : "Processing background jobs..."}
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
                            <Button variant="outline" size="sm" onClick={() => fetchCampaigns(false)} disabled={loading} className="gap-2">
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 flex">
                                <X className="h-4 w-4" />
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
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <SecurityLoader />
                        </div>
                    ) : filteredCampaigns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <Mail className="h-12 w-12 opacity-20 mb-4" />
                            <p>No campaigns found</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {filteredCampaigns.map((c, idx) => (
                                <MinimalCampaignRow
                                    key={c.id}
                                    campaign={c}
                                    index={filteredCampaigns.length - idx} // Reverse index so newest is highest number? Or just 1, 2, 3? User said "5, 4, 3...".
                                    // If sort is Newest First (Top), then idx 0 is the newest. If we want 5 (newest), then we should use length - idx.
                                    displayIndex={filteredCampaigns.length - idx}
                                    onDelete={(e) => deleteCampaign(c.id, e)}
                                    onCancelJob={cancelJob}
                                    searchTerm={searchTerm}
                                />
                            ))}
                            {/* Anchor to scroll to bottom if needed in future */}
                            <div className="h-px" />
                        </AnimatePresence>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function MinimalCampaignRow({ campaign, index, displayIndex, onDelete, onCancelJob, searchTerm }: { campaign: Campaign, index?: number, displayIndex: number, onDelete: (e: React.MouseEvent) => void, onCancelJob: (cid: string, jid: string, e?: React.MouseEvent) => void, searchTerm: string }) {
    const calculateProgress = (c: Campaign) => c.stats.total > 0
        ? ((c.stats.sent + c.stats.failed) / c.stats.total) * 100
        : 0;

    const [isOpen, setIsOpen] = useState(() => {
        // Auto-collapse if 100% finished, UNLESS searching
        if (searchTerm) return true;
        return calculateProgress(campaign) < 100;
    });

    // Auto-open if search term matches something inside
    useEffect(() => {
        if (searchTerm) setIsOpen(true);
    }, [searchTerm]);

    const progress = calculateProgress(campaign);

    // Filter jobs based on search term
    const filteredJobs = campaign.jobs.filter(job =>
        !searchTerm ||
        job.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Identify the next job to be processed (first PENDING in sorted list)
    const nextJobId = campaign.jobs.find(j => j.status === 'PENDING')?.id;

    return (
        <motion.div
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
                            {/* Status Badges */}
                            {campaign.name ? (
                                <span>
                                    {campaign.name} <span className="text-muted-foreground font-normal text-sm">({format(new Date(campaign.createdAt), "dd.MM.yyyy HH:mm")})</span>
                                </span>
                            ) : (
                                <span>Campaign <span className="text-muted-foreground font-normal text-sm">from {format(new Date(campaign.createdAt), "dd.MM.yyyy HH:mm")}</span></span>
                            )}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1 whitespace-nowrap overflow-hidden">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">{progress.toFixed(0)}% Done</span>

                            <span className="h-0.5 w-0.5 bg-neutral-300 rounded-full" />
                            <span>{campaign.stats.sent} Sent</span>

                            {campaign.stats.pending > 0 && (
                                <>
                                    <span className="h-0.5 w-0.5 bg-neutral-300 rounded-full" />
                                    <span>{campaign.stats.pending} Wait</span>
                                </>
                            )}

                            <span className="h-0.5 w-0.5 bg-neutral-300 rounded-full" />
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                                <span className={campaign.stats.opened > 0 ? "animate-pulse h-1.5 w-1.5 rounded-full bg-green-500" : ""} />
                                {campaign.stats.opened} Open
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 z-10">
                    {(campaign.stats.pending > 0) && (
                        <Button variant="ghost" size="sm" onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Stop all pending emails for this campaign?")) return;
                            try {
                                await fetch(`/api/campaigns/${campaign.id}/cancel`, { method: "PATCH" });
                            } catch (e) { console.error(e); }
                        }} className="text-orange-500 hover:bg-orange-50 hover:text-orange-600 h-8 px-2 p-0 gap-1 text-xs mr-2">
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Stop</span>
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8 px-2 p-0 gap-1 text-xs">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                    </Button>
                </div>
            </div>

            {/* Email List - Minimalist Table */}
            {isOpen && (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="bg-neutral-50/30 dark:bg-neutral-900/30 px-2 py-2 flex text-[10px] font-bold text-muted-foreground uppercase tracking-wider gap-1">
                        <div className="w-[65px] sm:w-[100px]">Status</div>
                        <div className="w-[45px] sm:w-[110px]">Opened</div>
                        <div className="flex-1 min-w-0">Recipient</div>
                        <div className="w-[45px] sm:w-[140px] text-right">Time</div>
                    </div>
                    {filteredJobs.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            No emails match "{searchTerm}"
                        </div>
                    )}
                    {filteredJobs.map((job) => {
                        const isNext = job.id === nextJobId;
                        const isFailed = job.status === 'FAILED';
                        const isPending = job.status === 'PENDING';
                        const isCancelled = job.status === 'CANCELLED';

                        const scheduledDate = new Date(job.scheduledFor);
                        const now = new Date();
                        const diffInMinutes = Math.floor((now.getTime() - scheduledDate.getTime()) / 60000);
                        const isOverdue = isPending && diffInMinutes > 0;

                        // Calculate delay for sent items if data exists, otherwise approximate
                        let sentDelay = 0;
                        if (job.status === 'SENT' && job.sentAt) {
                            sentDelay = Math.floor((new Date(job.sentAt).getTime() - scheduledDate.getTime()) / 60000);
                        }

                        // Colors for Overdue/Next (User requested non-blue, darker/brighter based on mode)
                        // Dark mode: Brighter bg? "darker or brighter based on white or dark mode"
                        // Interpretation: Stand out, but neutral/grey scale.
                        // Light: Checkered/Striped or just darker grey? "darker or brighter"
                        // Let's use a specific neutral shade that pops.
                        const activeJobClass = isNext
                            ? 'bg-neutral-100 dark:bg-neutral-800 border-l-4 border-neutral-600 dark:border-neutral-400'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-l-4 border-transparent';

                        return (
                            <div key={job.id} className={`relative p-2 sm:p-3 px-2 sm:px-4 flex items-center transition-colors text-sm gap-3 sm:gap-4 ${isCancelled ? 'opacity-60' : ''} ${activeJobClass}`}>

                                {/* Status Pill - FIRST */}
                                <div className="w-[65px] sm:w-[100px] flex-shrink-0 flex flex-col gap-1 items-center justify-center">
                                    {isNext && isOverdue && (
                                        <span className="text-[8px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-widest leading-none mb-0.5">
                                            Next Up
                                        </span>
                                    )}
                                    <Badge
                                        variant={job.status === 'SENT' ? 'default' : 'secondary'}
                                        className={`
                                        h-5 sm:h-6 px-0 text-[8px] sm:text-[10px] border-0 font-bold tracking-wide w-[60px] sm:w-[90px] justify-center shadow-none
                                        ${job.status === 'SENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100' :
                                                job.status === 'FAILED' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                                    job.status === 'CANCELLED' ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 line-through' :
                                                        'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-100'}
                                    `}
                                    >
                                        {job.status === 'SENT' ? 'SENT' :
                                            job.status === 'FAILED' ? 'FAILED' :
                                                job.status === 'CANCELLED' ? 'CANCELLED' :
                                                    'WAITING'}
                                    </Badge>
                                    {/* CRON Badge */}
                                    {job.sentViaCron && job.status === 'SENT' && (
                                        <Badge className="h-4 px-1.5 text-[7px] sm:text-[8px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 font-bold">
                                            CRON
                                        </Badge>
                                    )}
                                    {/* Retry Badge */}
                                    {(job as any).retryCount > 0 && (
                                        <Badge className="h-4 px-1.5 text-[7px] sm:text-[8px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 font-bold">
                                            RETRY #{(job as any).retryCount}
                                        </Badge>
                                    )}
                                </div>

                                {/* Opened Status - SECOND */}
                                <div className="w-[45px] sm:w-[110px] flex-shrink-0">
                                    {job.openedAt ? (
                                        <div className="flex flex-col leading-none sm:leading-tight">
                                            <div className="text-green-600 dark:text-green-500 font-medium text-[9px] sm:text-[10px] tracking-wide whitespace-nowrap">
                                                <span className="block sm:inline">{format(new Date(job.openedAt), "dd.MM")}</span>
                                                <span className="hidden sm:inline"> at </span>
                                                <span className="block sm:inline">{format(new Date(job.openedAt), "HH:mm")}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground pl-1 opacity-50">—</span>
                                    )}
                                </div>

                                {/* Recipient - THIRD (constrained width on mobile) */}
                                <div className="flex-1 min-w-0 max-w-[calc(100%-120px)] sm:max-w-none pr-2">
                                    <div className="text-[9px] sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={job.recipient}>
                                        {job.recipient}
                                    </div>
                                    <div className={`text-[8px] sm:text-xs truncate max-w-full ${isFailed ? 'text-red-500 font-medium' : 'text-muted-foreground opacity-80'}`} title={isFailed ? (job.error || "Unknown Failure") : job.subject}>
                                        {isFailed ? (
                                            <span className="flex items-start">
                                                <XCircle className="h-3 w-3 mr-1 flex-shrink-0 mt-0.5" />
                                                <span className="truncate">{job.error || "Delivery Failed"}</span>
                                            </span>
                                        ) : (
                                            job.subject ? (job.subject.length > 30 ? job.subject.slice(0, 30) + "..." : job.subject) : "(No Subject)"
                                        )}
                                    </div>
                                </div>

                                {/* Times & Cancel - Container for mobile layout */}
                                <div className="flex items-center justify-end gap-1 sm:gap-3 text-xs text-muted-foreground flex-shrink-0 w-[80px] sm:w-[160px]">
                                    <div className="text-right flex flex-col items-end">

                                        {isPending ? (
                                            /* PENDING (Scheduled or Overdue) */
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[9px] sm:text-xs bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-600 dark:text-neutral-400">
                                                    {format(scheduledDate, "HH:mm")}
                                                </span>
                                                {isOverdue && (
                                                    <span className="text-[9px] sm:text-xs font-bold text-orange-600 dark:text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1 py-0.5 rounded whitespace-nowrap">
                                                        +{diffInMinutes} min
                                                    </span>
                                                )}
                                                {/* Cancel Button - Mobile: Next to time */}
                                                {job.status === 'PENDING' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 w-5 p-0 text-neutral-400 hover:text-red-500 hover:bg-transparent sm:hidden"
                                                        onClick={(e) => onCancelJob(campaign.id, job.id, e)}
                                                        title="Cancel Email"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            /* DONE (Sent or Failed) */
                                            <div className="flex flex-col items-end gap-1">
                                                {!isFailed ? (
                                                    <div className="flex items-center gap-2 sm:gap-4">
                                                        {/* Original Schedule Group */}
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-medium leading-none mb-0.5">
                                                                {job.originalScheduledFor ? 'Updated' : 'Scheduled'}
                                                            </span>
                                                            <span className="font-mono text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400 font-bold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                                                {format(new Date(job.scheduledFor), "HH:mm")}
                                                            </span>
                                                        </div>

                                                        {/* Actual Sent Time Group - GREEN */}
                                                        <div className="flex flex-col items-center">
                                                            {/* Sent label - green to match time */}
                                                            <span className="text-[9px] sm:text-[10px] text-green-600/70 dark:text-green-400/70 font-medium leading-none mb-0.5">Sent</span>
                                                            <span className="font-mono text-[10px] sm:text-xs text-green-600 dark:text-green-500 font-bold bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                                                {job.sentAt ? format(new Date(job.sentAt), "HH:mm") : "-"}
                                                            </span>
                                                            {/* Delay Text (Below) */}
                                                            {sentDelay > 2 && (
                                                                <span className="text-[8px] font-medium text-orange-500 dark:text-orange-400 mt-0.5 leading-none">
                                                                    +{sentDelay} min
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="font-mono text-[9px] sm:text-xs bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 px-1.5 py-0.5 rounded">
                                                        {format(new Date(job.scheduledFor), "HH:mm")}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Cancel Job Button - Desktop only (mobile version is next to time) */}
                                    {job.status === 'PENDING' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="hidden sm:flex h-6 w-6 p-0 text-neutral-400 hover:text-red-500 hover:bg-transparent"
                                            onClick={(e) => onCancelJob(campaign.id, job.id, e)}
                                            title="Cancel Email"
                                        >
                                            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </motion.div>
    )
}

// Update Top Level component to inject cancel handler or just rely on global scope?
// Actually we need to add "Stop Campaign" button to the header of MinimalCampaignRow too.

