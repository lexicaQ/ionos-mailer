import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { Attachment } from '@/lib/schemas';

// Keep env vars as defaults
const DEFAULT_SMTP_HOST = process.env.SMTP_HOST;
const DEFAULT_SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const DEFAULT_SMTP_USER = process.env.SMTP_USER;
const DEFAULT_SMTP_PASS = process.env.SMTP_PASS;
const DEFAULT_SMTP_SECURE = process.env.SMTP_SECURE === 'true';

export interface SmtpConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    delay?: number;
    fromName?: string; // Added for anti-spam
}

interface SendMailParams {
    to: string;
    subject: string;
    text: string;
    html?: string;
    config?: SmtpConfig;
    attachments?: Attachment[];
}

// Cache for transporters to reuse connections
const transporterCache = new Map<string, nodemailer.Transporter>();

export async function sendEmail({ to, subject, text, html, config, attachments }: SendMailParams) {

    // Determine configuration to use
    const host = config?.host || DEFAULT_SMTP_HOST;
    const port = config?.port || DEFAULT_SMTP_PORT;
    const user = config?.user || DEFAULT_SMTP_USER;
    const pass = config?.pass || DEFAULT_SMTP_PASS;
    const secure = config ? config.secure : DEFAULT_SMTP_SECURE;
    const fromName = config?.fromName || user?.split('@')[0] || 'Sender';

    if (!host || !user || !pass) {
        throw new Error('SMTP credentials are not fully configured. Please check your settings.');
    }

    // Create a cache key based on credentials
    const cacheKey = JSON.stringify({ host, port, user, pass, secure });
    let transporter = transporterCache.get(cacheKey);

    if (!transporter) {
        // console.log(`Creating new transporter for ${user} at ${host}:${port}`);
        transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass,
            },
            // Connection pooling for better performance
            pool: true,
            maxConnections: 1, // Keep single connection to avoid blocking
            rateDelta: 1000,
            rateLimit: 3, // max 3 emails per second
            // High Timeouts for reliability (Prevents "Connection Timeout" on weak networks)
            connectionTimeout: 60000,
            greetingTimeout: 30000,
            socketTimeout: 60000,
        });
        transporterCache.set(cacheKey, transporter);
    } else {
        // console.log(`Reusing transporter for ${user}`);
    }

    // console.log(`Sending email to ${to} via ${host}:${port}`);

    try {
        // Generate unique Message-ID for tracking
        const domain = user.split('@')[1] || 'localhost';
        const messageId = `<${uuidv4()}@${domain}>`;

        const info = await transporter.sendMail({
            from: `"${fromName}" <${user}>`, // Proper From with name
            replyTo: user, // Reply-To header
            to,
            subject,
            text,
            html: html || text,
            messageId,
            attachments: attachments?.map(att => ({
                filename: att.filename,
                content: Buffer.from(att.content, 'base64'),
                contentType: att.contentType,
            })),
            headers: {
                // Anti-spam headers
                'X-Priority': '3', // Normal priority
                'X-Mailer': 'IONOS Mailer Pro',
                'Precedence': 'bulk', // Indicates bulk mail (honest)
                // Add List-Unsubscribe header (improves deliverability)
                'List-Unsubscribe': `<mailto:${user}?subject=Unsubscribe>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            }
        });

        // Do NOT close the transporter here if we want to reuse the pool!
        // transporter.close(); 

        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error('Error sending email:', error);

        // Only close/remove from cache if it's a fatal connection error
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            transporter.close();
            transporterCache.delete(cacheKey);
        }

        // Return specific error messages
        if (error.responseCode === 535) {
            return { success: false, error: "Authentication failed (535). Check username/password." };
        }
        if (error.responseCode === 550) {
            return { success: false, error: "Recipient rejected (550). Email address invalid or blocked." };
        }
        if (error.code === 'ECONNREFUSED') {
            return { success: false, error: "Connection refused. Check host/port." };
        }
        if (error.code === 'ETIMEDOUT') {
            return { success: false, error: "Connection timeout. Server not reachable." };
        }
        return { success: false, error: error.message };
    }
}

