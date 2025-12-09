import nodemailer from 'nodemailer';

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
}

interface SendMailParams {
    to: string;
    subject: string;
    text: string;
    html?: string;
    config?: SmtpConfig;
}

export async function sendEmail({ to, subject, text, html, config }: SendMailParams) {

    // Determine configuration to use
    const host = config?.host || DEFAULT_SMTP_HOST;
    const port = config?.port || DEFAULT_SMTP_PORT;
    const user = config?.user || DEFAULT_SMTP_USER;
    const pass = config?.pass || DEFAULT_SMTP_PASS;
    const secure = config ? config.secure : DEFAULT_SMTP_SECURE;

    if (!host || !user || !pass) {
        throw new Error('SMTP credentials are not fully configured. Please check your settings.');
    }

    console.log(`Creating transporter with: Host=${host}, Port=${port}, User=${user}, Secure=${secure}`);

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: user, // Sender is the authenticated user
            to,
            subject,
            text,
            html: html || text,
        });
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error('Error sending email:', error);
        // Return specific error message for 535
        if (error.responseCode === 535) {
            return { success: false, error: "Authentifizierung fehlgeschlagen (535). Prüfen Sie Benutzername/Passwort." };
        }
        return { success: false, error: error.message };
    }
}
