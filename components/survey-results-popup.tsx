'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface SurveyResultsPopupProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    surveyChoice: string | null
    surveyClickedAt: string | null
    recipient: string
}

const choiceConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
    yes: {
        label: "Yes, I'm in!",
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-500',
        icon: (
            <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline strokeLinecap="round" strokeLinejoin="round" points="22 4 12 14.01 9 11.01" />
            </svg>
        )
    },
    maybe: {
        label: "Let me think",
        color: 'text-orange-700 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        borderColor: 'border-orange-500',
        icon: (
            <svg className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        )
    },
    no: {
        label: "Not interested",
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-500',
        icon: (
            <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
        )
    }
}

export function SurveyResultsPopup({ open, onOpenChange, surveyChoice, surveyClickedAt, recipient }: SurveyResultsPopupProps) {
    const config = surveyChoice ? (choiceConfig[surveyChoice.toLowerCase()] || choiceConfig.yes) : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Survey Response
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    {/* Recipient */}
                    <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{recipient}</span>
                    </div>

                    {surveyChoice && config ? (
                        <>
                            {/* Choice Visualization */}
                            <div className={`p-6 rounded-xl border-2 ${config.borderColor} ${config.bgColor} text-center animate-in fade-in zoom-in duration-300`}>
                                <div className="flex justify-center mb-4 animate-bounce">
                                    {config.icon}
                                </div>
                                <p className={`text-lg font-bold ${config.color}`}>
                                    {config.label}
                                </p>
                            </div>

                            {/* Timestamp */}
                            {surveyClickedAt && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Responded at:</span>
                                    <Badge variant="secondary" className="font-mono">
                                        {format(new Date(surveyClickedAt), 'dd.MM.yyyy HH:mm')}
                                    </Badge>
                                </div>
                            )}

                            {/* Visual confirmation */}
                            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                                <p className="text-xs text-muted-foreground">
                                    This is exactly what the recipient saw after clicking
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <svg className="h-12 w-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm">No survey response yet</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
