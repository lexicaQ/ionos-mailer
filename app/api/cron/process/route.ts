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
        // Limit processing to 1 email per run to ensure:
        // 1. We stay under Vercel Hobby 10s timeout
        // 2. We can enforce the 5s delay reliably across the chain
        const pendingJobs = await prisma.emailJob.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: now }
            },
            include: { campaign: true },
            take: 1
        });

        if (pendingJobs.length === 0) {
            // Check if there are ANY pending jobs in the future
            const futureJobs = await prisma.emailJob.count({
                where: { status: 'PENDING' }
            });
            console.log(`Cron: No due jobs. Total future pending: ${futureJobs}`);
            return NextResponse.json({
                message: "No pending jobs due.",
                serverTime: now.toISOString(),
                futurePendingCount: futureJobs
            });
        }

        console.log(`Cron: Found ${pendingJobs.length} due jobs. Processing...`);

        const results = [];

        // Helper to add delay
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Process single job
        const job = pendingJobs[0];
        let pass = "";
        try {
            pass = decrypt(job.campaign.pass, secretKey);
        } catch (e) {
            console.error(`Failed to decrypt for job ${job.id}`, e);
            await prisma.emailJob.update({
                where: { id: job.id },
                data: { status: 'FAILED', error: "Decryption failed" }
            });
            results.push({ id: job.id, success: false });
        }

        if (pass) {
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

                        await prisma.emailJob.update({
                            where: { id: job.id },
                            data: { body: finalBody, subject: finalSubject }
                        });
                    }
                } catch (e) {
                    console.error("Failed to extract company info", e);
                }
            }

            // Create HTML with tracking for open/click detection
            const htmlWithTracking = textToHtmlWithTracking(finalBody, job.trackingId, baseUrl);

            try {
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
            } catch (sendError: any) {
                console.error(`Failed to send email ${job.id}:`, sendError);
                await prisma.emailJob.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', error: sendError.message || 'Unknown send error' }
                });
                results.push({ id: job.id, success: false });
            }
        }

        // Enforce 5s delay AFTER processing to protect rate limit for the NEXT run
        // This ensures even if we chain instantly, there is a 5s gap between sends.
        await delay(5000);

        // If we processed successfully, trigger the next batch immediately
        if (results.length > 0) {
            console.log("Triggering next job (Fire-and-Forget)...");
            // CRITICAL: DO NOT AWAIT response. awaiting causes the current function to wait for the NEXT function (5s),
            // which leads to a timeout chain (5+5 = 10s limit).
            // We just start the request and exit.
            fetch(`${baseUrl}/api/cron/process?t=${Date.now()}`, {
                method: 'GET',
                headers: { 'x-manual-trigger': 'true' }
            }).catch(e => console.error('Recursive trigger failed:', e));

            // Give 100ms for the request to leave the socket before we kill the process by returning
            await new Promise(r => setTimeout(r, 100));
        }

        return NextResponse.json({ processed: results.length, results });

    } catch (error: any) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
