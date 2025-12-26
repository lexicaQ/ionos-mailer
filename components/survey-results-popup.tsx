'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { CheckCircle2, HelpCircle, XCircle, User } from 'lucide-react'

interface EmailJob {
    id: string
    recipient: string
    surveyChoice?: string | null
    surveyClickedAt?: string | null
    // ... other fields not needed for display
}

interface SurveyResultsPopupProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    campaignName?: string | null
    jobs: EmailJob[]
}

const choiceConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
    yes: {
        label: "Interested",
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: CheckCircle2
    },
    maybe: {
        label: "Considering",
        color: 'text-orange-700 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: HelpCircle
    },
    no: {
        label: "Not Interested",
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: XCircle
    }
}

export function SurveyResultsPopup({ open, onOpenChange, campaignName, jobs }: SurveyResultsPopupProps) {
    // Filter only jobs with survey responses
    const responses = jobs.filter(j => j.surveyChoice);

    // Calculate stats
    const stats = {
        yes: responses.filter(j => j.surveyChoice === 'yes').length,
        maybe: responses.filter(j => j.surveyChoice === 'maybe').length,
        no: responses.filter(j => j.surveyChoice === 'no').length,
        total: responses.length
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 bg-white dark:bg-neutral-950">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        Survey Results
                        {campaignName && <span className="text-muted-foreground font-normal text-base ml-2">for "{campaignName}"</span>}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col p-6 pt-2 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        {['yes', 'maybe', 'no'].map((type) => {
                            const config = choiceConfig[type];
                            const count = stats[type as keyof typeof stats];
                            const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                            const Icon = config.icon;

                            return (
                                <div key={type} className={`p-4 rounded-xl border ${config.borderColor} ${config.bgColor} flex flex-col items-center justify-center text-center gap-1`}>
                                    <Icon className={`h-6 w-6 ${config.color} mb-1`} />
                                    <span className={`text-2xl font-bold ${config.color}`}>{count}</span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{config.label}</span>
                                    <span className="text-[10px] text-muted-foreground opacity-70">{percent}%</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Respondent List */}
                    <div className="flex-1 overflow-hidden border rounded-lg bg-neutral-50/50 dark:bg-neutral-900/20 flex flex-col">
                        <div className="p-3 border-b bg-neutral-50 dark:bg-neutral-900/50 text-xs font-medium text-muted-foreground flex justify-between">
                            <span>Respondent</span>
                            <span>Choice & Time</span>
                        </div>
                        <ScrollArea className="flex-1">
                            {responses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <p>No survey responses yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {responses
                                        // Sort by clickedAt decent
                                        .sort((a, b) => new Date(b.surveyClickedAt || 0).getTime() - new Date(a.surveyClickedAt || 0).getTime())
                                        .map((job) => {
                                            const choice = job.surveyChoice?.toLowerCase() || 'unknown';
                                            const config = choiceConfig[choice];

                                            return (
                                                <div key={job.id} className="p-3 text-sm flex items-center justify-between hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${config?.bgColor || 'bg-neutral-100'}`}>
                                                            <User className={`h-4 w-4 ${config?.color || 'text-neutral-500'}`} />
                                                        </div>
                                                        <div className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                                                            {job.recipient}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                        {config && (
                                                            <Badge variant="outline" className={`${config.color} ${config.borderColor} ${config.bgColor} border hover:bg-transparent`}>
                                                                {choice === 'yes' ? "Interested" : choice === 'maybe' ? "Considering" : "Not Interested"}
                                                            </Badge>
                                                        )}
                                                        {job.surveyClickedAt && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {format(new Date(job.surveyClickedAt), 'MMM dd, HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
