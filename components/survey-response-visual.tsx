'use client'

import { motion } from 'framer-motion'

interface SurveyResponseVisualProps {
    response: string | null
    respondedAt?: string | null
}

const RESPONSE_CONFIG = {
    yes: {
        color: '#22c55e',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
        borderColor: 'border-green-200 dark:border-green-800',
        emoji: '✓',
        label: 'Ja, interessiert!',
        description: 'Positive Rückmeldung'
    },
    maybe: {
        color: '#f59e0b',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        emoji: '🤔',
        label: 'Überlege noch',
        description: 'Unentschlossen'
    },
    no: {
        color: '#ef4444',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-800',
        emoji: '✗',
        label: 'Kein Interesse',
        description: 'Negative Rückmeldung'
    }
}

export function SurveyResponseVisual({ response, respondedAt }: SurveyResponseVisualProps) {
    if (!response || !(response in RESPONSE_CONFIG)) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>Keine Umfrage-Antwort verfügbar</p>
            </div>
        )
    }

    const config = RESPONSE_CONFIG[response as keyof typeof RESPONSE_CONFIG]

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`p-8 rounded-lg border-2 ${config.bgColor} ${config.borderColor}`}
        >
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className="text-7xl mb-4"
                    style={{ color: config.color }}
                >
                    {config.emoji}
                </motion.div>

                <motion.h3
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold mb-2"
                    style={{ color: config.color }}
                >
                    {config.label}
                </motion.h3>

                <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-muted-foreground mb-4"
                >
                    {config.description}
                </motion.p>

                {respondedAt && (
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-xs text-muted-foreground"
                    >
                        Beantwortet: {new Date(respondedAt).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}
