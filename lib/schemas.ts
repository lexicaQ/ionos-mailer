import { z } from "zod"

export const emailFormSchema = z.object({
    subject: z.string().min(1, "Betreff ist erforderlich").max(100, "Betreff zu lang (max. 100 Zeichen)"),
    body: z.string().min(1, "Nachrichtentext ist erforderlich"),
    recipients: z.array(z.object({
        email: z.string().email("Ungültige E-Mail-Adresse"),
        id: z.string().optional(),
    })).min(1, "Mindestens ein gültiger Empfänger ist erforderlich"),
    smtpSettings: z.object({
        host: z.string().min(1),
        port: z.number(),
        user: z.string().min(1, "Benutzername erforderlich"),
        pass: z.string().min(1, "Passwort erforderlich"),
        secure: z.boolean(),
        delay: z.number().optional()
    }).optional(),
})

export type EmailFormValues = z.infer<typeof emailFormSchema>

export interface SendResult {
    email: string
    success: boolean
    messageId?: string
    error?: string
    timestamp: string
}
