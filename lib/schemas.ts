import { z } from "zod"

export const attachmentSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(), // UI often uses 'name'
    filename: z.string(),
    content: z.string(), // Base64 encoded
    contentType: z.string(),
    size: z.number().optional()
})

export type Attachment = z.infer<typeof attachmentSchema>

export const emailFormSchema = z.object({
    subject: z.string().min(1, "Betreff ist erforderlich").max(100, "Betreff zu lang (max. 100 Zeichen)"),
    body: z.string().min(1, "Nachrichtentext ist erforderlich"),
    recipients: z.array(z.object({
        email: z.string().email("Ungültige E-Mail-Adresse"),
        id: z.string().optional(),
    })).min(1, "Mindestens ein gültiger Empfänger ist erforderlich"),
    attachments: z.array(attachmentSchema).optional(),
    smtpSettings: z.object({
        host: z.string().min(1),
        port: z.number(),
        user: z.string().min(1, "Benutzername erforderlich"),
        pass: z.string().min(1, "Passwort erforderlich"),
        secure: z.boolean(),
        delay: z.number().optional()
    }).optional(),
    name: z.string().optional(),
})

export type EmailFormValues = z.infer<typeof emailFormSchema>

export interface SendResult {
    email: string
    success: boolean
    messageId?: string
    error?: string
    timestamp: string
    trackingId?: string
}
