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
    subject: z.string().min(1, "Subject is required").max(100, "Subject too long (max. 100 characters)"),
    body: z.string().min(1, "Message text is required"),
    recipients: z.array(z.object({
        email: z.string().email("Invalid email address"),
        id: z.string().optional(),
    })).min(1, "At least one valid recipient is required"),
    attachments: z.array(attachmentSchema).optional(),
    smtpSettings: z.object({
        host: z.string().min(1),
        port: z.number(),
        user: z.string().min(1, "Username required"),
        pass: z.string().min(1, "Password required"),
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
