# IONOS Mailer

A modern, high-performance web application designed for sending bulk emails via IONOS SMTP (or any other SMTP provider) with professional tracking, scheduling, and security features. Built with Next.js 14, TypeScript, and Tailwind CSS.

---

## Key Features

### Sending Engine
*   **SMTP Integration**: Works seamlessly with IONOS (smtp.ionos.de).
*   **Rate Limiting**: Intelligent sequential processing to prevent spam blocks.
*   **Background Mode**: Utilize a serverless Cron architecture to send emails over hours (e.g., 500 emails over 4 hours) without keeping the browser open.
*   **Offline Capability**: Once a campaign is started, the server takes over. You can close your laptop.

### Analytics & Tracking
*   **Open Tracking**: Invisible pixel injection (1x1.png) to detect when emails are opened.
*   **Click Tracking**: Rewrite links to track engagement before redirection.
*   **Live Dashboard**: Real-time status updates (Pending, Sent, Failed, Opened).
*   **History**: Comprehensive log of all sent emails.
*   **Export**: Download reports as Excel (.xlsx) or PDF with visual charts.

### User Interface (UI/UX)
*   **Modern Design**: Built with shadcn/ui and Tailwind CSS.
*   **Monochrome Dark Mode**: Strict high-contrast black/white theme for focused work.
*   **Responsive**: Functions perfectly on Desktop and Mobile.
*   **Smart Input**: Paste bulk email lists; the app automatically cleans and validates them.

### Security & Privacy
*   **Encryption**: SMTP passwords are encrypted using AES-256-GCM before being stored in the database.
*   **Data Isolation**: Every browser session has a unique userId. You only see your own campaigns.
*   **No Code Leakage**: Strict separation of concerns. Credentials are never exposed to the client-side.
*   **Sanitized Logging**: Server logs are hardened to prevent accidental leakage of sensitive config data.

---

## Architecture

### Tech Stack
*   **Framework**: Next.js 14 (App Router)
*   **Database**: PostgreSQL (via Neon / Prisma ORM)
*   **Styling**: Tailwind CSS, Shadcn UI, Lucide Icons
*   **Email Engine**: Nodemailer
*   **Cron**: Vercel Cron + Recursive Fetch

### How Background Sending Works
1.  **Campaign Creation**: When you start a background campaign, the app saves the job and encrypted credentials to the database.
2.  **Trigger**: The app hits the internal /api/cron/process endpoint.
3.  **Processing**: The server fetches one pending job, decrypts the password, sends the email, and updates the status.
4.  **Recursion**: The job ends by triggering /api/cron/process again if more jobs are pending.
    *   Note: This recursive pattern bypasses Vercel's 10s execution timeout limit, allowing for infinite-duration campaigns.

---

## Configuration & Setup

### 1. Environment Variables (Vercel)
For the app to function in production, you must set these variables in Vercel:

| Variable | Description |
| :--- | :--- |
| POSTGRES_PRISMA_URL | Connection string for your PostgreSQL database (e.g. Neon.tech) |
| POSTGRES_URL_NON_POOLING | Direct connection string for migrations |
| ENCRYPTION_KEY | A random 32-character string for password encryption. |
| CRON_SECRET | A secret string to protect the Cron endpoint from unauthorized access. |
| NEXT_PUBLIC_BASE_URL | Critical: Your domain (e.g. https://your-app.vercel.app) for tracking links. |

### 2. Local Development
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your .env file (copy .env.example).
4.  Run the development server:
    ```bash
    npm run dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000).

---

## SEO & Meta
The application produces SEO-optimized HTML with proper:
*   **Open Graph (OG) Images**: Unique preview for social sharing.
*   **Metadata**: Title, description, and keywords optimized for "IONOS Mailer" and "SMTP Tool".
*   **Favicons**: Custom generated icons for all devices (Apple Touch Icon, standard .ico).

---

## Security Best Practices
*   **Never** share your ENCRYPTION_KEY.
*   **Lock your device**: The app stores session settings in localStorage. Access to your unlocked browser grants access to your configured SMTP settings.
*   **Tracking**: Note that tracking pixels require the recipient to load images. Values are conservative minimums.

---

*Verified & Audited by Antigravity AI - Dec 2025*
