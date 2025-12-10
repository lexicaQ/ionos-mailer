import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { sendEmail } from '@/lib/mail';
import { textToHtmlWithTracking } from '@/lib/tracking';
import { extractCompanyFromEmail } from '@/lib/company-scraper';

export async function GET(req: NextRequest) {
    // 1. Security Check - Allow manual trigger during development or internal calls
    const authHeader = req.headers.get('authorization');
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isManualTrigger = req.headers.get('x-manual-trigger') === 'true';

    // In production, require CRON_SECRET unless it's a manual trigger from the app
    if (process.env.NODE_ENV === 'production' && !isVercelCron && !isManualTrigger) {
        // Allow if referer is from our own domain
        const referer = req.headers.get('referer') || '';
        const host = req.headers.get('host') || '';
        if (!referer.includes(host)) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) throw new Error("No Encryption Key configured");

        // Get base URL for tracking
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // 2. Find Pending Jobs that are due
        const now = new Date();
        const pendingJobs = await prisma.emailJob.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: now }
            },
            include: { campaign: true },
            take: 20
        });

        if (pendingJobs.length === 0) {
            return NextResponse.json({ message: "No pending jobs due." });
        }

        const results = [];

        // 3. Process Jobs
        for (const job of pendingJobs) {
            let pass = "";
            try {
                pass = decrypt(job.campaign.pass, secretKey);
            } catch (e) {
                console.error(`Failed to decrypt for job ${job.id}`, e);
                await prisma.emailJob.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', error: "Decryption failed" }
                });
                continue;
            }

            // Company Name Extraction & Replacement
            let finalBody = job.body;
            let finalSubject = job.subject;

            // Check for placeholders
            const placeholderRegex = /(XXX|{{Company}}|{{Firma}}|\[Company\]|\[Firma\])/g;

            if (placeholderRegex.test(finalBody) || placeholderRegex.test(finalSubject)) {
                try {
                    const companyName = await extractCompanyFromEmail(job.recipient);
                    if (companyName) {
                        finalBody = finalBody.replace(placeholderRegex, companyName);
                        finalSubject = finalSubject.replace(placeholderRegex, companyName);

                        // Update the job with the enhanced content so we know what was sent
                        await prisma.emailJob.update({
                            where: { id: job.id },
                            data: { body: finalBody, subject: finalSubject } // Ideally we should store this
                        });
                    } else {
                        // Fallback: If we can't find it, replace with generic "Partner" or keep generic?
                        // User said "replace it", but if we fail? 
                        // Let's replace with "Partner" or similar to avoid "Dear Team of XXX" 
                        // But maybe XXX is better left if manual intervention needed?
                        // For now, let's leave it or replace with empty string if it looks weird?
                        // "Dear Team of XXX" -> "Dear Team of " looks bad.
                        // "Dear Team of Partner" is okay.
                        // Better to stick to "Team" if we can't find it?
                        // Let's replace XXX with "Team" if the context suggests "Team of XXX" -> "Team of Team" (bad)
                        // This is risky. Let's just NOT replace if not found, or maybe just remove XXX in a smart way?
                        // Simpler: Just try to extract, if null, do nothing or user has to ensure data.
                    }
                } catch (e) {
                    console.error("Failed to extract company info", e);
                }
            }

            // Create HTML with tracking
            const htmlWithTracking = textToHtmlWithTracking(finalBody, job.trackingId, baseUrl);

            // Send with tracking
            const response = await sendEmail({
                to: job.recipient,
                subject: finalSubject,
                text: finalBody,
                html: htmlWithTracking,
                config: {
                    host: job.campaign.host,
                    port: job.campaign.port,
                    user: job.campaign.user,
                    pass: pass,
                    secure: job.campaign.secure,
                }
            });

            // Update DB
            await prisma.emailJob.update({
                where: { id: job.id },
                data: {
                    status: response.success ? 'SENT' : 'FAILED',
                    sentAt: new Date(),
                    error: response.error || null
                }
            });

            results.push({ id: job.id, success: response.success });
        }

        return NextResponse.json({ processed: results.length, results });

    } catch (error: any) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
