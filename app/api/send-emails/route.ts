import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { emailFormSchema, SendResult } from '@/lib/schemas';

export async function POST(req: Request) {
    try {
        const json = await req.json();
        const result = emailFormSchema.safeParse(json);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Validierung fehlgeschlagen', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { subject, body, recipients, smtpSettings } = result.data;
        const results: SendResult[] = [];

        // Rate limiting or simple protection could go here.
        // For now we trust the user as this is a personal tool authenticated via their SMTP.

        // Sequential sending
        // Enforce minimum delay of 1.5s to avoid 450 rate limit errors
        const explicitDelay = smtpSettings?.delay || 0;
        const delayMs = Math.max(explicitDelay, 5000); // Minimum 5s for IONOS rate limit

        for (const recipient of recipients) {
            // Always wait before sending (rate limit protection)
            await new Promise(resolve => setTimeout(resolve, delayMs));

            const sendResponse = await sendEmail({
                to: recipient.email,
                subject,
                text: body,
                config: smtpSettings,
            });

            results.push({
                email: recipient.email,
                success: sendResponse.success,
                messageId: sendResponse.messageId,
                error: sendResponse.error,
                timestamp: new Date().toISOString(),
            });
        }

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Interner Server-Fehler' },
            { status: 500 }
        );
    }
}
