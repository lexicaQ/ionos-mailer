import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/encryption';
import { sendEmail } from '@/lib/mail';
import { processBodyWithTracking } from '@/lib/tracking';
import { extractCompanyFromEmail } from '@/lib/company-scraper';

// Helper function for the core logic (reused by GET and POST)
async function handleCronRequest(req: NextRequest) {
    // Security Check - Allow:
    // 1. Vercel native cron (Authorization: Bearer CRON_SECRET)
    // 2. Manual trigger from same domain (x-manual-trigger: true)
    // 3. GitHub Actions with x-vercel-protection-bypass header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isManualTrigger = req.headers.get('x-manual-trigger') === 'true';
    const hasProtectionBypass = !!req.headers.get('x-vercel-protection-bypass');

    // In production, verify the request is legitimate
    if (process.env.NODE_ENV === 'production' && !isVercelCron && !isManualTrigger && !hasProtectionBypass) {
        // Allow if referer is from our own domain
        const referer = req.headers.get('referer') || '';
        const origin = req.headers.get('origin') || '';
        const host = req.headers.get('host') || '';
        const isFromSameDomain = (referer && referer.includes(host)) || (origin && origin.includes(host));

        if (!isFromSameDomain) {
            console.log('Cron: Unauthorized request rejected');
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        const secretKey = process.env.ENCRYPTION_KEY;
        if (!secretKey) throw new Error("No Encryption Key configured");

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        // SINGLE EMAIL: Process 1 email per invocation
        // cron-job.org runs every 3 minutes = 1 email every 3 minutes
        const BATCH_SIZE = 1;
        const now = new Date();

        const pendingJobs = await prisma.emailJob.findMany({
            where: {
                status: { in: ['PENDING', 'FAILED'] }, // Also retry failed emails
                scheduledFor: { lte: now }
            },
            include: { campaign: { include: { attachments: true } } },
            take: BATCH_SIZE,
            orderBy: { scheduledFor: 'asc' } // First in, first out
        });

        if (pendingJobs.length === 0) {
            // Check future count only if idle, to save massive DB queries on busy loops
            const futureJobs = await prisma.emailJob.count({ where: { status: 'PENDING' } });
            return NextResponse.json({
                processed: 0,
                message: "No pending jobs due.",
                futurePendingCount: futureJobs
            });
        }

        console.log(`Cron: Found batch of ${pendingJobs.length} jobs.`);
        const results = [];
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Process Batch
        for (const job of pendingJobs) {
            // CONCURRENCY LOCK: Atomic update to ensure no double-processing
            const locked = await prisma.emailJob.updateMany({
                where: { id: job.id, status: { in: ['PENDING', 'FAILED'] } },
                data: { status: 'SENDING', error: null } // Clear previous error on retry
            });

            if (locked.count === 0) {
                console.log(`Job ${job.id} already picked up by another worker. Skipping.`);
                continue;
            }

            let pass = "";
            try {
                pass = decrypt(job.campaign.pass, secretKey);
            } catch (e) {
                console.error(`Failed to decrypt password for job ${job.id}`);
                await prisma.emailJob.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', error: "Decryption failed" }
                });
                continue;
            }

            if (pass) {
                let finalBody = "";
                let finalSubject = "";
                let attachments: { filename: string; content: string; contentType: string }[] = [];

                try {
                    finalBody = decrypt(job.body, secretKey);
                    finalSubject = decrypt(job.subject, secretKey);

                    if (job.campaign.attachments) {
                        attachments = job.campaign.attachments.map((att: any) => ({
                            filename: att.filename,
                            content: decrypt(att.content, secretKey),
                            contentType: att.contentType
                        }));
                    }
                } catch (e) {
                    await prisma.emailJob.update({
                        where: { id: job.id },
                        data: { status: 'FAILED', error: "Content decryption failed" }
                    });
                    results.push({ id: job.id, success: false });
                    continue;
                }

                // Placeholders & Company Name
                const { replacePlaceholders, PLACEHOLDER_REGEX } = await import('@/lib/placeholder-utils');
                if (PLACEHOLDER_REGEX.test(finalBody) || PLACEHOLDER_REGEX.test(finalSubject)) {
                    try {
                        const decryptedRecipient = decrypt(job.recipient, secretKey);
                        const companyName = await extractCompanyFromEmail(decryptedRecipient);
                        finalBody = replacePlaceholders(finalBody, companyName);
                        finalSubject = replacePlaceholders(finalSubject, companyName);

                        // Save processed content for audit
                        await prisma.emailJob.update({
                            where: { id: job.id },
                            data: {
                                body: encrypt(finalBody, secretKey),
                                subject: encrypt(finalSubject, secretKey)
                            }
                        });
                    } catch (e) {
                        finalBody = replacePlaceholders(finalBody, null);
                        finalSubject = replacePlaceholders(finalSubject, null);
                    }
                }

                const decryptedRecipient = decrypt(job.recipient, secretKey);
                const htmlWithTracking = processBodyWithTracking(finalBody, job.trackingId, baseUrl);

                try {
                    let smtpUser = job.campaign.user;
                    let fromName = job.campaign.fromName;
                    try { smtpUser = decrypt(job.campaign.user, secretKey); } catch (e) { }
                    if (fromName) { try { fromName = decrypt(fromName, secretKey); } catch (e) { } }

                    const response = await sendEmail({
                        to: decryptedRecipient,
                        subject: finalSubject,
                        text: finalBody,
                        html: htmlWithTracking,
                        config: {
                            host: job.campaign.host,
                            port: job.campaign.port,
                            user: smtpUser,
                            pass: pass,
                            secure: job.campaign.secure,
                            fromName: fromName || undefined,
                        },
                        attachments: attachments,
                    });

                    await prisma.emailJob.update({
                        where: { id: job.id },
                        data: {
                            status: response.success ? 'SENT' : 'FAILED',
                            sentAt: response.success ? new Date() : undefined,
                            error: response.error || null
                        }
                    });
                    results.push({ id: job.id, success: response.success });

                } catch (sendError: any) {
                    const errorMsg = sendError.message || 'Unknown send error';
                    const isRetryable = errorMsg.includes('timeout') ||
                        errorMsg.includes('ETIMEDOUT') ||
                        errorMsg.includes('ECONNREFUSED') ||
                        errorMsg.includes('ECONNRESET');

                    await prisma.emailJob.update({
                        where: { id: job.id },
                        data: {
                            status: isRetryable ? 'PENDING' : 'FAILED', // Retry on timeout
                            error: isRetryable ? `Retrying: ${errorMsg}` : errorMsg
                        }
                    });
                    results.push({ id: job.id, success: false, retrying: isRetryable });
                }
            }

            // Rate Limit: Removed artificial delay to optimize CPU usage
            // rely on natural network latency and provider limits
            // await delay(500);
        }

        // NOTE: No recursive trigger - cron-job.org handles timing (every 3 minutes)
        // This prevents CPU usage from self-triggering loops

        return NextResponse.json({
            processed: results.length,
            batchSize: BATCH_SIZE,
            results
        });

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
