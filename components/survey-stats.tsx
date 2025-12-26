'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface SurveyStatsProps {
    campaignId: string
}

interface Stats {
    yes: number
    maybe: number
    no: number
    total: number
    responseRate: number
}

export function SurveyStats({ campaignId }: SurveyStatsProps) {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch(`/api/campaigns/${campaignId}/survey-stats`)
                if (res.ok) {
                    const data = await res.json()
                    setStats(data)
                }
            } catch (error) {
                console.error('Failed to fetch survey stats:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [campaignId])

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-neutral-200 dark:border-neutral-800 border-t-black dark:border-t-white rounded-full mx-auto"></div>
            </div>
        )
    }

    if (!stats || stats.total === 0) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                <p className="text-sm">Keine Umfrage-Antworten für diese Kampagne</p>
            </div>
        )
    }

    const responses = [
        { label: 'Ja, interessiert', value: stats.yes, color: '#22c55e', bgColor: 'bg-green-500' },
        { label: 'Überlege noch', value: stats.maybe, color: '#f59e0b', bgColor: 'bg-orange-500' },
        { label: 'Kein Interesse', value: stats.no, color: '#ef4444', bgColor: 'bg-red-500' }
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold">Kampagnen-Statistik</h4>
                <span className="text-sm text-muted-foreground">
                    {stats.total} Antwort{stats.total !== 1 ? 'en' : ''} ({stats.responseRate.toFixed(1)}%)
                </span>
            </div>

            <div className="space-y-3">
                {responses.map((item, idx) => {
                    const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0

                    return (
                        <motion.div
                            key={item.label}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{item.label}</span>
                                <span className="text-sm text-muted-foreground">
                                    {item.value} ({percentage.toFixed(0)}%)
                                </span>
                            </div>
                            <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ delay: idx * 0.1 + 0.2, duration: 0.5 }}
                                    className={`h-full ${item.bgColor}`}
                                />
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
