import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptStrict, decryptMaybeLegacy, encrypt } from '@/lib/encryption';
import { sendEmail } from '@/lib/mail';
import { processBodyWithTracking } from '@/lib/tracking';
import { extractCompanyFromEmail } from '@/lib/company-scraper';
import { auth } from '@/auth';

// Helper function for the core logic (reused by GET and POST)
async function handleCronRequest(req: NextRequest) {
    // Security Check - Allow:
    // 1. Vercel native cron (Authorization: Bearer CRON_SECRET)
    // 2. Manual trigger from same domain with valid session
    // 3. GitHub Actions with x-vercel-protection-bypass header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isManualTrigger = req.headers.get('x-manual-trigger') === 'true';
    const hasProtectionBypass = !!req.headers.get('x-vercel-protection-bypass');

    // SECURITY: Manual trigger now requires authentication
    if (isManualTrigger) {
        // Validate Sec-Fetch-Site header (same-origin only)
        const secFetchSite = req.headers.get('sec-fetch-site');
        if (secFetchSite && secFetchSite !== 'same-origin') {
            console.log('Cron: Manual trigger rejected - not same-origin');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Require auth session for manual triggers
        const session = await auth();
        if (!session?.user?.id) {
            console.log('Cron: Manual trigger rejected - no session');
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    // In production, verify the request is legitimate
    if (process.env.NODE_ENV === 'production' && !isVercelCron && !isManualTrigger && !hasProtectionBypass) {
        // Strict origin matching (not just includes)
        const origin = req.headers.get('origin') || '';
        const host = req.headers.get('host') || '';
        const expectedDomain = `https://${host}`;
        const isFromSameDomain = origin === expectedDomain || origin === `http://${host}`;

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

        // SEQUENTIAL PROCESSING: Process multiple emails per invocation
        // Increased from 1 to 10 to handle campaign batches efficiently
        // This ensures all emails in a campaign get processed even if browser closes
        const BATCH_SIZE = 10;
        const now = new Date();

        // PRIORITY QUEUE SYSTEM:
        // 1. CAMPAIGN EMAILS FIRST (scheduled background sends with intervals)
        //    These are planned emails that user expects to go out on schedule
        // 2. DIRECT SENDS SECOND (immediate sends via "Send Directly" button)
        //    These can wait a bit as they're fire-and-forget

        // 1. First Priority: Campaign emails (name is encrypted OR null, NOT "DIRECT")
        // Note: Prisma's { not: "DIRECT" } does NOT match null values, so we need OR logic
        const campaignJobs = await prisma.emailJob.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: now },
                nextRetryAt: null,
                campaign: {
                    OR: [
                        { name: null },           // Campaigns with no name
                        { name: { not: "DIRECT" } } // Campaigns with encrypted names
                    ]
                }
            },
            include: { campaign: { include: { attachments: true } } },
            take: BATCH_SIZE,
            orderBy: { scheduledFor: 'asc' }  // Oldest scheduled first
        });

        console.log(`Cron: Found ${campaignJobs.length} campaign jobs due.`);

        // 2. Second Priority: Direct sends (only if campaign queue has room)
        let directJobs: any[] = [];
        const remainingSlots = BATCH_SIZE - campaignJobs.length;

        if (remainingSlots > 0) {
            directJobs = await prisma.emailJob.findMany({
                where: {
                    status: 'PENDING',
                    scheduledFor: { lte: now },
                    nextRetryAt: null,
                    campaign: { name: "DIRECT" }  // Direct sends
                },
                include: { campaign: { include: { attachments: true } } },
                take: remainingSlots,
                orderBy: { scheduledFor: 'asc' }
            });
            console.log(`Cron: Found ${directJobs.length} direct send jobs due.`);
        }

        // Combine: Campaigns first, then direct sends
        let scheduledJobs = [...campaignJobs, ...directJobs];

        let remainingSlotsAfterScheduled = BATCH_SIZE - scheduledJobs.length;


        // Fill remaining batch slots with resend jobs (PENDING with nextRetryAt)
        const resendJobs = remainingSlotsAfterScheduled > 0
            ? await prisma.emailJob.findMany({
                where: {
                    status: 'PENDING',
                    nextRetryAt: { lte: now } // Due for retry
                },
                include: { campaign: { include: { attachments: true } } },
                take: remainingSlotsAfterScheduled,
                orderBy: { scheduledFor: 'asc' } // Still oldest-first
            })
            : [];

        let remainingSlotsForFailed = remainingSlotsAfterScheduled - resendJobs.length;

        // AUTO-RETRY: Pick up FAILED emails ONLY if manually triggered
        const failedJobs = (remainingSlotsForFailed > 0 && isManualTrigger)
            ? await prisma.emailJob.findMany({
                where: {
                    status: 'FAILED'
                    // No retryCount check needed for manual trigger - user can force retry anything
                },
                include: { campaign: { include: { attachments: true } } },
                take: remainingSlotsForFailed,
                orderBy: { scheduledFor: 'asc' }
            })
            : [];

        const pendingJobs = [...scheduledJobs, ...resendJobs, ...failedJobs];

        if (pendingJobs.length === 0) {
            const futureJobs = await prisma.emailJob.count({ where: { status: 'PENDING' } });
            const failedCount = await prisma.emailJob.count({ where: { status: 'FAILED', retryCount: { lt: 3 } } });
            return NextResponse.json({
                processed: 0,
                message: "No pending jobs due.",
                futurePendingCount: futureJobs,
                failedRetryableCount: failedCount
            });
        }

        console.log(`Cron: Found batch of ${pendingJobs.length} jobs.`);
        const results = [];
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Process Batch
        for (const job of pendingJobs) {
            // CONCURRENCY LOCK: Atomic update to ensure no double-processing
            // Accept both PENDING and FAILED status (for auto-retry of failed emails)
            const locked = await prisma.emailJob.updateMany({
                where: {
                    id: job.id,
                    status: { in: ['PENDING', 'FAILED'] } // Allow FAILED for retry
                },
                data: { status: 'SENDING' }
            });

            if (locked.count === 0) {
                console.log(`Job ${job.id} already picked up by another worker. Skipping.`);
                continue;
            }

            // RETRY LIMIT CHECK: Prevent infinite retry loops (unless manual trigger)
            if (job.retryCount >= job.maxRetries && !isManualTrigger) {
                console.log(`Job ${job.id} exceeded max retries (${job.maxRetries}). Marking as permanently FAILED.`);
                await prisma.emailJob.update({
                    where: { id: job.id },
                    data: {
                        status: 'FAILED',
                        error: `Max retries (${job.maxRetries}) exceeded. Last error: ${job.error || 'Unknown'}`
                    }
                });
                results.push({ id: job.id, success: false, reason: 'max_retries_exceeded' });
                continue;
            }

            let pass = "";
            try {
                // CRITICAL: Use strict decryption for SMTP password - never return garbage
                pass = decryptStrict(job.campaign.pass, secretKey);
            } catch (e) {
                console.error(`SMTP_DECRYPT_FAIL job=${job.id}`);
                await prisma.emailJob.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', error: "SMTP credential error" }
                });
                continue;
            }

            if (pass) {
                let finalBody = "";
                let finalSubject = "";
                let attachments: { filename: string; content: string; contentType: string }[] = [];

                try {
                    finalBody = decryptMaybeLegacy(job.body, secretKey);
                    finalSubject = decryptMaybeLegacy(job.subject, secretKey);

                    if (job.campaign.attachments) {
                        attachments = job.campaign.attachments.map((att: any) => ({
                            filename: att.filename,
                            content: decryptMaybeLegacy(att.content, secretKey),
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
                        const decryptedRecipient = decryptMaybeLegacy(job.recipient, secretKey);
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

                const decryptedRecipient = decryptMaybeLegacy(job.recipient, secretKey);
                const htmlWithTracking = processBodyWithTracking(finalBody, job.trackingId, baseUrl);

                try {
                    let smtpUser = job.campaign.user;
                    let fromName = job.campaign.fromName;
                    try { smtpUser = decryptMaybeLegacy(job.campaign.user, secretKey); } catch (e) { }
                    if (fromName) { try { fromName = decryptMaybeLegacy(fromName, secretKey); } catch (e) { } }

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

                    // Update job status
                    // sentViaCron should ONLY be true if:
                    // - Manual cron trigger (isManualTrigger) AND
                    // - Job was previously FAILED (job.status === 'FAILED')
                    const wasFailedRetry = isManualTrigger && job.status === 'FAILED';

                    await prisma.emailJob.update({
                        where: { id: job.id },
                        data: {
                            status: response.success ? 'SENT' : 'FAILED',
                            sentAt: response.success ? new Date() : undefined,
                            sentViaCron: response.success && wasFailedRetry ? true : undefined,
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

                    if (isRetryable) {
                        // Schedule for retry in 1 minute, increment retry count
                        await prisma.emailJob.update({
                            where: { id: job.id },
                            data: {
                                status: 'PENDING',
                                retryCount: { increment: 1 },
                                nextRetryAt: new Date(Date.now() + 60000), // 1 minute later
                                originalScheduledFor: job.originalScheduledFor ?? job.scheduledFor,
                                error: `Retry ${job.retryCount + 1}: ${errorMsg}`
                            }
                        });
                        results.push({ id: job.id, success: false, retrying: true });
                    } else {
                        // Permanent failure - no retry
                        await prisma.emailJob.update({
                            where: { id: job.id },
                            data: {
                                status: 'FAILED',
                                error: errorMsg,
                                retryCount: { increment: 1 } // Increment even on permanent fail to prevent infinite loops
                            }
                        });
                        results.push({ id: job.id, success: false, retrying: false });
                    }
                }
            }

            // Rate Limit: Removed artificial delay to optimize CPU usage
            // rely on natural network latency and provider limits
            // await delay(500);
        }

        // RECURSION: If we processed a full batch, there might be more.
        // Trigger immediately with retry logic for reliability
        if (pendingJobs.length === BATCH_SIZE) {
            console.log("Full batch processed. Triggering next batch immediately.");
            const triggerUrl = `${baseUrl}/api/cron/process?t=${Date.now()}`;

            // Retry logic to ensure recursion doesn't fail silently
            const triggerNextBatch = async (retries = 3) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        const response = await fetch(triggerUrl, {
                            method: 'POST',
                            headers: {
                                'x-manual-trigger': 'true',
                                'User-Agent': 'vercel-cron/1.0',
                                ...(process.env.CRON_SECRET ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` } : {}),
                                ...(process.env.VERCEL_PROTECTION_BYPASS ? { 'x-vercel-protection-bypass': process.env.VERCEL_PROTECTION_BYPASS } : {})
                            },
                            signal: AbortSignal.timeout(5000)
                        });

                        if (response.ok) {
                            console.log('Recursive trigger succeeded');
                            return true;
                        }
                    } catch (e) {
                        console.error(`Recursive trigger attempt ${i + 1} failed:`, e);
                        if (i < retries - 1) {
                            await delay(1000); // Wait 1s before retry
                        }
                    }
                }
                console.error('All recursive trigger attempts failed');
                return false;
            };

            await triggerNextBatch();
        }

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
