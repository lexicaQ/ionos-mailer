/**
 * Bounce Email Parser
 * Connects to IMAP inbox and parses Non-Delivery Reports (NDRs)
 * to update job status in the database.
 */

import imaps from 'imap-simple';
import { simpleParser, ParsedMail } from 'mailparser';
import { prisma } from './prisma';

// IMAP Configuration from environment
const IMAP_CONFIG = {
    imap: {
        user: process.env.BOUNCE_EMAIL_USER || '',
        password: process.env.BOUNCE_EMAIL_PASS || '',
        host: process.env.BOUNCE_IMAP_HOST || 'imap.ionos.de',
        port: parseInt(process.env.BOUNCE_IMAP_PORT || '993'),
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
    }
};

// Common bounce status code meanings
const BOUNCE_CODE_MEANINGS: Record<string, string> = {
    '5.0.0': 'Permanent delivery failure',
    '5.1.0': 'Address rejected',
    '5.1.1': 'Mailbox does not exist',
    '5.1.2': 'Domain not found',
    '5.1.3': 'Invalid address syntax',
    '5.2.0': 'Mailbox unavailable',
    '5.2.1': 'Mailbox full',
    '5.2.2': 'Over quota',
    '5.3.0': 'Mail system full',
    '5.4.0': 'Routing failure',
    '5.4.4': 'Unable to route',
    '5.5.0': 'Protocol error',
    '5.7.0': 'Security policy rejection',
    '5.7.1': 'Blocked by policy',
    '4.0.0': 'Temporary failure (will retry)',
    '4.2.2': 'Mailbox full (temporary)',
    '4.4.1': 'Connection timed out',
    '4.4.7': 'Delivery timeout',
    '4.7.0': 'Temporary authentication failure',
};

interface BounceInfo {
    recipient: string;
    bounceCode: string;
    bounceReason: string;
    messageId?: string;
    rawHeaders?: string;
}

/**
 * Parse a bounce email to extract recipient and error details
 */
function parseBounceEmail(emailText: string, parsedMail: ParsedMail): BounceInfo | null {
    // Look for the failed recipient
    let recipient: string | null = null;
    let bounceCode: string = '5.0.0'; // Default permanent failure
    let bounceReason: string = 'Permanent delivery failure';
    let messageId: string | undefined;

    // Extract from headers if present
    const headers = parsedMail.headers;

    // Try to find the failed recipient address
    // Pattern 1: "Final-Recipient:rfc822;email@domain.com"
    const finalRecipientMatch = emailText.match(/Final-Recipient:\s*rfc822;?\s*([^\s<>\r\n]+)/i);
    if (finalRecipientMatch) {
        recipient = finalRecipientMatch[1].trim();
    }

    // Pattern 2: "The following address failed:" block
    if (!recipient) {
        const addressFailedMatch = emailText.match(/The following address failed:\s*\n*\s*([^\s<>:\r\n]+@[^\s<>:\r\n]+)/i);
        if (addressFailedMatch) {
            recipient = addressFailedMatch[1].trim();
        }
    }

    // Pattern 3: Generic "failed" line with email
    if (!recipient) {
        const genericFailedMatch = emailText.match(/failed[:\s]+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (genericFailedMatch) {
            recipient = genericFailedMatch[1].trim();
        }
    }

    // Extract SMTP status code
    // Pattern: "Status:5.0.0" or "Status: 5.0.0"
    const statusMatch = emailText.match(/Status:\s*([45]\.\d+\.\d+)/i);
    if (statusMatch) {
        bounceCode = statusMatch[1];
        bounceReason = BOUNCE_CODE_MEANINGS[bounceCode] || `SMTP Error ${bounceCode}`;
    }

    // Try to extract original Message-ID
    // Pattern: "Message-ID: <uuid@domain>"
    const messageIdMatch = emailText.match(/Message-ID:\s*<([^>]+)>/i);
    if (messageIdMatch) {
        messageId = messageIdMatch[1];
    }

    // Additional reason extraction from body
    if (emailText.includes('multiple delivery attempts failed')) {
        bounceReason = 'Multiple delivery attempts failed';
    } else if (emailText.includes('mailbox is full')) {
        bounceReason = 'Mailbox is full';
        bounceCode = bounceCode || '5.2.2';
    } else if (emailText.includes('user unknown') || emailText.includes('does not exist')) {
        bounceReason = 'Mailbox does not exist';
        bounceCode = bounceCode || '5.1.1';
    } else if (emailText.includes('spam') || emailText.includes('blocked')) {
        bounceReason = 'Blocked as spam';
        bounceCode = bounceCode || '5.7.1';
    }

    if (!recipient) {
        console.log('[BounceParser] Could not extract recipient from bounce email');
        return null;
    }

    return {
        recipient: recipient.toLowerCase(),
        bounceCode,
        bounceReason,
        messageId,
    };
}

/**
 * Check if an email is a bounce/NDR
 */
function isBounceEmail(parsedMail: ParsedMail): boolean {
    const subject = parsedMail.subject?.toLowerCase() || '';
    const from = typeof parsedMail.from?.text === 'string' ? parsedMail.from.text.toLowerCase() : '';

    // Common bounce indicators
    const bounceSubjects = [
        'delivery status notification',
        'undelivered mail',
        'returned mail',
        'failure notice',
        'mail delivery failed',
        'delivery failure',
        'undeliverable',
        'mail delivery subsystem',
        'mailer-daemon',
    ];

    const bounceFroms = [
        'mailer-daemon',
        'postmaster',
        'mail-daemon',
        'noreply',
        'no-reply',
    ];

    return (
        bounceSubjects.some(s => subject.includes(s)) ||
        bounceFroms.some(f => from.includes(f)) ||
        parsedMail.headers?.get('auto-submitted') === 'auto-replied'
    );
}

/**
 * Process all unread bounce emails from the inbox
 * Returns count of processed bounces
 */
export async function processBounceEmails(): Promise<{ processed: number; errors: number }> {
    // Validate configuration
    if (!IMAP_CONFIG.imap.user || !IMAP_CONFIG.imap.password) {
        console.log('[BounceParser] IMAP credentials not configured, skipping bounce processing');
        return { processed: 0, errors: 0 };
    }

    let connection: imaps.ImapSimple | null = null;
    let processed = 0;
    let errors = 0;

    try {
        console.log('[BounceParser] Connecting to IMAP server...');
        connection = await imaps.connect(IMAP_CONFIG);

        await connection.openBox('INBOX');

        // Search for unread emails (potential bounces)
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: false, // Don't mark seen until we successfully process
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`[BounceParser] Found ${messages.length} unread messages`);

        for (const message of messages) {
            try {
                // Get full email content
                const allPart = message.parts.find(part => part.which === '');
                if (!allPart) continue;

                const emailText = allPart.body;
                const parsedMail = await simpleParser(emailText);

                // Check if this is a bounce email
                if (!isBounceEmail(parsedMail)) {
                    console.log(`[BounceParser] Skipping non-bounce: ${parsedMail.subject}`);
                    continue;
                }

                console.log(`[BounceParser] Processing bounce: ${parsedMail.subject}`);

                // Parse bounce details
                const bounceInfo = parseBounceEmail(emailText, parsedMail);
                if (!bounceInfo) {
                    console.log('[BounceParser] Could not parse bounce info');
                    errors++;
                    continue;
                }

                console.log(`[BounceParser] Bounce for: ${bounceInfo.recipient}, Code: ${bounceInfo.bounceCode}`);

                // Find matching job in database
                // Match by recipient email (case insensitive)
                const job = await prisma.emailJob.findFirst({
                    where: {
                        recipient: {
                            equals: bounceInfo.recipient,
                            mode: 'insensitive',
                        },
                        status: 'SENT', // Only update already-sent emails
                        isBounce: false, // Not already marked as bounced
                    },
                    orderBy: {
                        sentAt: 'desc', // Most recent first
                    },
                });

                if (job) {
                    // Update job with bounce info
                    await prisma.emailJob.update({
                        where: { id: job.id },
                        data: {
                            status: 'BOUNCED',
                            isBounce: true,
                            bounceCode: bounceInfo.bounceCode,
                            bounceReason: bounceInfo.bounceReason,
                            bouncedAt: new Date(),
                        },
                    });

                    console.log(`[BounceParser] Updated job ${job.id} as bounced`);
                    processed++;

                    // Mark email as read
                    await connection.addFlags(message.attributes.uid, '\\Seen');
                } else {
                    console.log(`[BounceParser] No matching job found for ${bounceInfo.recipient}`);
                    // Still mark as read to avoid reprocessing
                    await connection.addFlags(message.attributes.uid, '\\Seen');
                }

            } catch (msgError) {
                console.error('[BounceParser] Error processing message:', msgError);
                errors++;
            }
        }

    } catch (error) {
        console.error('[BounceParser] IMAP connection error:', error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (e) {
                // Ignore close errors
            }
        }
    }

    console.log(`[BounceParser] Completed: ${processed} processed, ${errors} errors`);
    return { processed, errors };
}

/**
 * Get bounce statistics for a campaign
 */
export async function getCampaignBounceStats(campaignId: string) {
    const [total, bounced, softBounces, hardBounces] = await Promise.all([
        prisma.emailJob.count({ where: { campaignId } }),
        prisma.emailJob.count({ where: { campaignId, isBounce: true } }),
        prisma.emailJob.count({
            where: {
                campaignId,
                isBounce: true,
                bounceCode: { startsWith: '4' } // Temporary/soft bounces
            }
        }),
        prisma.emailJob.count({
            where: {
                campaignId,
                isBounce: true,
                bounceCode: { startsWith: '5' } // Permanent/hard bounces
            }
        }),
    ]);

    return {
        total,
        bounced,
        softBounces,
        hardBounces,
        bounceRate: total > 0 ? ((bounced / total) * 100).toFixed(2) + '%' : '0%',
    };
}
