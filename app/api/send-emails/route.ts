import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { emailFormSchema, SendResult } from '@/lib/schemas';
import { extractCompanyFromEmail } from '@/lib/company-scraper';
import { processBodyWithTracking } from '@/lib/tracking';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

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

        const { subject, body, recipients, smtpSettings, attachments, userId } = result.data as any; // Cast to any to access userId if not in schema yet
        const effectiveUserId = userId || "anonymous";
        const results: SendResult[] = [];

        // Get base URL for tracking
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
            console.error("No ENCRYPTION_KEY configured");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // 1. Find or Create "Direct Send" Campaign Container
        // We group direct sends by Month to avoid one giant list
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const campaignName = `Direkt-Versand ${currentMonth}`;

        // Try to find existing campaign for this user
        let campaign = await prisma.campaign.findFirst({
            where: {
                userId: effectiveUserId,
                host: "DIRECT", // Marker for direct containers
                fromName: campaignName
            }
        });

        if (!campaign) {
            // Create new container campaign
            campaign = await prisma.campaign.create({
                data: {
                    userId: effectiveUserId,
                    host: "DIRECT",
                    port: 0,
                    user: "direct-send",
                    pass: encrypt("n/a", encryptionKey),
                    secure: true,
                    fromName: campaignName,
                }
            });
        }

        // Sequential sending
        // Enforce minimum delay of 1.5s to avoid 450 rate limit errors
        const explicitDelay = smtpSettings?.delay || 0;
        const delayMs = Math.max(explicitDelay, 5000); // Minimum 5s for IONOS rate limit

        // Check if placeholders exist in the template
        const placeholderRegex = /(XXX|xxx|{{Company}}|{{Firma}}|\[Company\]|\[Firma\])/gi;
        const hasPlaceholders = placeholderRegex.test(body) || placeholderRegex.test(subject);

        for (const recipient of recipients) {
            // Always wait before sending (rate limit protection)
            await new Promise(resolve => setTimeout(resolve, delayMs));

            let finalSubject = subject;
            let finalBody = body;

            // Perform replacement if needed
            if (hasPlaceholders) {
                try {
                    const companyName = await extractCompanyFromEmail(recipient.email);
                    // Use company name if found, otherwise empty string to remove placeholder
                    const replacement = companyName || "";

                    finalSubject = finalSubject.replace(placeholderRegex, replacement);
                    finalBody = finalBody.replace(placeholderRegex, replacement);
                } catch (e) {
                    console.error(`Failed to extract company for ${recipient.email}`, e);
                    // In case of error, also remove placeholder to be safe
                    finalSubject = finalSubject.replace(placeholderRegex, "");
                    finalBody = finalBody.replace(placeholderRegex, "");
                }
            }

            // Generate unique tracking ID for this email
            const trackingId = randomUUID();

            // 2. Persist Job to Database
            // We save it BEFORE sending, so we have the record. Status PENDING -> SENT/FAILED
            const job = await prisma.emailJob.create({
                data: {
                    campaignId: campaign.id,
                    recipient: recipient.email,
                    subject: encrypt(finalSubject, encryptionKey),
                    body: encrypt(finalBody, encryptionKey),
                    status: 'PENDING',
                    scheduledFor: new Date(),
                    trackingId: trackingId
                }
            });

            // Process body with tracking (adds pixel and wraps links)
            const htmlWithTracking = processBodyWithTracking(finalBody, trackingId, baseUrl);

            let success = false;
            let errorMsg: string | undefined = undefined;
            let msgId: string | undefined = undefined;

            try {
                const sendResponse = await sendEmail({
                    to: recipient.email,
                    subject: finalSubject,
                    text: finalBody,
                    html: htmlWithTracking,
                    config: smtpSettings,
                    attachments,
                });
                success = sendResponse.success;
                errorMsg = sendResponse.error;
                msgId = sendResponse.messageId;
            } catch (e: any) {
                success = false;
                errorMsg = e.message;
            }

            // 3. Update Job Status
            await prisma.emailJob.update({
                where: { id: job.id },
                data: {
                    status: success ? 'SENT' : 'FAILED',
                    sentAt: new Date(),
                    error: errorMsg
                }
            });

            results.push({
                email: recipient.email,
                success: success,
                messageId: msgId,
                error: errorMsg,
                timestamp: new Date().toISOString(),
                trackingId: success ? trackingId : undefined,
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
