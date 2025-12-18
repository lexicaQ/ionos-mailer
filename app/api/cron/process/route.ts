import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/encryption';
import { sendEmail } from '@/lib/mail';
import { processBodyWithTracking } from '@/lib/tracking';
import { extractCompanyFromEmail } from '@/lib/company-scraper';

// Helper function for the core logic (reused by GET and POST)
async function handleCronRequest(req: NextRequest) {
    // 1. Security Check - Allow manual trigger during development or internal calls
    const authHeader = req.headers.get('authorization');
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isManualTrigger = req.headers.get('x-manual-trigger') === 'true';

    // In production, require CRON_SECRET unless it's a manual trigger from the app
    if (process.env.NODE_ENV === 'production' && !isVercelCron && !isManualTrigger) {
        // Allow if referer is from our own domain
        // Check both Referer and Origin for strictness
        const referer = req.headers.get('referer') || '';
        const origin = req.headers.get('origin') || '';
        const host = req.headers.get('host') || '';

        const isFromSameDomain = referer.includes(host) || origin.includes(host);

        if (!isFromSameDomain) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }
    // ... rest of logic stays mostly same, but we need to ensure the recursive trigger uses POST too


    try {
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) throw new Error("No Encryption Key configured");

        // Get base URL for tracking - PRIORITIZE stable production URL over VERCEL_URL
        // VERCEL_URL changes with each deployment, breaking tracking for old emails
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

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
            include: { campaign: { include: { attachments: true } } },
            take: 20 // Increased batch size for background processing
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

        // Process up to 2 jobs
        for (const job of pendingJobs) {
            let pass = "";
            try {
                pass = decrypt(job.campaign.pass, secretKey);
            } catch (e) {
                console.error(`Failed to decrypt password for job ${job.id}`, e instanceof Error ? e.message : String(e));
                await prisma.emailJob.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', error: "Decryption failed" }
                });
                results.push({ id: job.id, success: false });
                continue; // Skip onto next
            }
            // ... (rest of processing logic, will close loop after pushing result)

            if (pass) {
                // Decrypt content for processing
                let finalBody = "";
                let finalSubject = "";
                let attachments: { filename: string; content: string; contentType: string }[] = [];

                try {
                    finalBody = decrypt(job.body, secretKey);
                    finalSubject = decrypt(job.subject, secretKey);

                    // Decrypt attachments
                    if (job.campaign.attachments) {
                        attachments = job.campaign.attachments.map((att: any) => ({
                            filename: att.filename,
                            content: decrypt(att.content, secretKey),
                            contentType: att.contentType
                        }));
                    }
                } catch (e) {
                    console.error(`Failed to decrypt content for job ${job.id}`, e);
                    await prisma.emailJob.update({
                        where: { id: job.id },
                        data: { status: 'FAILED', error: "Content decryption failed" }
                    });
                    return NextResponse.json({ processed: 1, results: [{ id: job.id, success: false }] });
                }

                // Company Name Extraction & Replacement
                // Check for placeholders
                const { replacePlaceholders, PLACEHOLDER_REGEX } = await import('@/lib/placeholder-utils');

                if (PLACEHOLDER_REGEX.test(finalBody) || PLACEHOLDER_REGEX.test(finalSubject)) {
                    try {
                        const companyName = await extractCompanyFromEmail(job.recipient);

                        // Use centralized logic for both Subject and Body
                        // Note: If companyName is null (not found/generic), it will remove "at XXX" entirely
                        finalBody = replacePlaceholders(finalBody, companyName);
                        finalSubject = replacePlaceholders(finalSubject, companyName);

                        // Only update DB if we actually found a company to maintain "Smart" data?
                        // Actually, we should probably save the *processed* version so we know what was sent.
                        // But wait, if we remove it, we are changing the content significantly.
                        // Saving the processed version is correct for audit trail.

                        // RE-ENCRYPT updated content before saving history/job
                        await prisma.emailJob.update({
                            where: { id: job.id },
                            data: {
                                body: encrypt(finalBody, secretKey),
                                subject: encrypt(finalSubject, secretKey)
                            }
                        });

                    } catch (e) {
                        console.error("Failed to extract company info", e);
                        // Safe fallback: Remove placeholders
                        finalBody = replacePlaceholders(finalBody, null);
                        finalSubject = replacePlaceholders(finalSubject, null);
                    }
                }

                // Create HTML with tracking for open/click detection
                const htmlWithTracking = processBodyWithTracking(finalBody, job.trackingId, baseUrl);

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
                            fromName: job.campaign.fromName || undefined,
                        },
                        attachments: attachments,
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
                    console.error(`Failed to send email ${job.id}:`, sendError instanceof Error ? sendError.message : String(sendError));
                    await prisma.emailJob.update({
                        where: { id: job.id },
                        data: { status: 'FAILED', error: sendError.message || 'Unknown send error' }
                    });
                    results.push({ id: job.id, success: false });
                }
            }

        }

        // Enforce 2s delay AFTER processing (Optimized for Vercel 10s limit)
        // This leaves ~5-7s headroom for valid execution before timeout
        await delay(2000);

        // If we processed successfully, trigger the next batch immediately
        if (results.length > 0) {
            console.log("Triggering next job (Fire-and-Forget)...");
            // Use a non-awaited promise to trigger recursion without blocking 
            // We use a timestamp to bypass Vercel caching
            const triggerUrl = `${baseUrl}/api/cron/process?t=${Date.now()}`;

            // Trigger next job recursively
            // We await it to ensure Vercel doesn't kill the request before it leaves execution context
            console.log(`Triggering next job recursively at ${triggerUrl}...`);
            await fetch(triggerUrl, {
                method: 'POST',
                headers: {
                    'x-manual-trigger': 'true',
                    'User-Agent': 'vercel-cron/1.0',
                    // Only add Authorization if CRON_SECRET is defined to avoid "Bearer undefined"
                    ...(process.env.CRON_SECRET ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` } : {})
                },
                // Use a safe timeout (e.g., 5s) to ensure request is sent but not block too long
                signal: AbortSignal.timeout(5000)
            }).then(res => {
                console.log(`Recursive trigger response: ${res.status} ${res.statusText}`);
                if (!res.ok) console.error("Recursive trigger failed with non-OK status");
            }).catch(e => console.error('Recursive trigger failed:', e instanceof Error ? e.message : String(e)));
        }
        return NextResponse.json({ processed: results.length, results });

    } catch (error: any) {
        console.error("Cron Job Fatal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handleCronRequest(req);
}

export async function POST(req: NextRequest) {
    return handleCronRequest(req);
}
