# IONOS Mailer

A professional, high-performance email marketing application designed for privacy, security, and ease of use. Built with **Next.js 16**, **TypeScript**, and **PostgreSQL**, it offers a robust alternative to expensive SaaS platforms by leveraging your own SMTP credentials (IONOS or any other provider) while maintaining strict data isolation and privacy.

---

## Features

### Advanced Sending Engine
- **SMTP Integration**: Connects directly to your mail server (e.g., `smtp.ionos.de`).
- **Background Processing**: Uses a sophisticated **Serverless Cron** architecture to process campaigns in the background. Once a campaign is initiated, the server handles the queue independently of the client session.
- **Rate Limiting**: Implementation of intelligent throttling (e.g., 500ms delay between emails) to prevent spam flagging by SMTP providers.
- **Smart Queue**: Automatically handles job failures and retries without manual intervention.

### Smart Drafts & Editor
- **Rich Text Editor**: Full support for formatting including Bold, Italic, Underline, and Links.
- **Context-Aware Placeholders**: 
  - Supports dynamic injection such as `{{Company}}` or `at XXX`. 
  - The system automatically detects user domains/companies. If no company is found for a recipient, generic "at XXX" text is automatically stripped to maintain professional appearance.
- **Cloud Sync**: Drafts are automatically synchronized to the PostgreSQL database, ensuring data persistence across devices.
- **Preview Mode**: Real-time rendering of email content with specific recipient data to verify placeholder resolution before sending.

### Live Tracking & Analytics
- **Real-Time Dashboard**: WebSocket-like updates for campaign status (Pending, Sent, Failed, Opened).
- **Open Tracking**: Privacy-compliant 1x1 pixel tracking detects open rates.
- **Link Tracking**: Automatic URL rewriting tracks click engagement before redirecting to the destination.
- **Historical Logs**: Comprehensive, searchable history of all sent emails.
- **Export Capabilities**: Generate detailed reports in **Excel (.xlsx)** or **PDF** (Black & White professional format) for offline analysis.

### Privacy & Security
We prioritize data sovereignty and transparency.
- **Encryption**: SMTP passwords are encrypted at rest using **AES-256-GCM** before storage in the database.
- **Isolation**: strict multi-tenancy architecture. Every user has a unique ID, and all data queries are scoped to the authenticated user.
- **Bot Protection**: Custom Middleware proactively blocks known scrapers (GPTBot, Ahrefs, Semrush, etc.) to protect tracking links from false positives.
- **No Third-Party Tracking**: The application is self-contained. No data is sent to third-party analytics services.

---

## System Architecture

### Backend
- **Framework**: Next.js 16 (App Router) utilizing Server Actions for mutations.
- **Database**: PostgreSQL (managed via Prisma ORM). Relational schema includes `User`, `Campaign`, `Job`, `Draft`, and `SmtpSettings`.
- **Authentication**: NextAuth.js v5 (Auth.js) utilizing secure, HTTP-only sessions with CSRF protection.
- **Cron System**: Implemented via a recursive self-calling API pattern (`/api/cron/process`). This design allows long-running campaigns (thousands of emails) to bypass Vercel's standard execution time limits by processing in discrete batches.

### Frontend
- **UI Architecture**: Built with React Server Components (RSC) for performance and Client Components for interactivity.
- **Component Library**: Custom implementation using Shadcn/UI and Radix Primitives for accessibility.
- **Styling**: Tailwind CSS v4 with a strict monochrome design system to minimize visual distraction.

### Data Flow
1.  **Authentication**: User logs in via Email/Password. A secure session cookie is established.
2.  **Job Submission**: When a campaign is started, the frontend submits the job payload. The backend encrypts the SMTP credentials using the `ENCRYPTION_KEY` and persists the job to the `Campaign` and `Job` tables in PostgreSQL.
3.  **Background Processing**: A background worker (triggered via Vercel Cron or manual API call) wakes up, fetches a batch of pending jobs, decrypts the credentials in ephemeral memory, dispatches emails via Nodemailer, and updates the database status.
4.  **Synchronization**: The client uses polling intervals to fetch the latest status from `/api/campaigns/status`, ensuring the UI reflects the real-time state of the server-side queue.

---

## Installation & Local Usage

This guide details the steps to deploy the application on a local machine for development or testing.

### Prerequisites
- **Node.js**: Version 18.0.0 or higher.
- **PostgreSQL**: A running PostgreSQL instance (Local or Cloud-hosted like Neon, Supabase, or AWS RDS).
- **Git**: For version control.

### Step-by-Step Guide

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/ionos-mailer.git
    cd ionos-mailer
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory. You must define the following variables:
    ```env
    # Database Connection
    # Direct connection string to your PostgreSQL database
    POSTGRES_PRISMA_DATABASE_URL="postgresql://user:password@host:port/db?sslmode=require"
    POSTGRES_URL="postgresql://user:password@host:port/db?sslmode=require"

    # Security Keys
    # Use `openssl rand -base64 32` to generate secure keys
    AUTH_SECRET="your-random-auth-secret-32-chars"
    ENCRYPTION_KEY="your-random-32-char-string-for-aes" 
    CRON_SECRET="your-random-secret-for-cron-protection"

    # Application URL
    # Used for generating tracking links. Set to localhost for dev.
    NEXT_PUBLIC_BASE_URL="http://localhost:3000"
    ```

4.  **Initialize Database Schema**
    Run the Prisma migration to create the necessary tables.
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Run Development Server**
    Start the local development server.
    ```bash
    npm run dev
    ```

6.  **Access the Application**
    Open your web browser and navigate to `http://localhost:3000`.

### Production Deployment (Vercel)
This application is optimized for deployment on Vercel.
1.  Push your code to a GitHub repository.
2.  Import the project into Vercel.
3.  Navigate to **Settings > Environment Variables** and add all variables from Step 3.
4.  Deploy the project.
5.  **Critical Configuration**: Set up a Vercel Cron Job to hit the `/api/cron/process` endpoint every minute. This ensures background processing continues reliably even when no users are active.

---

## Data Privacy Statement

**Data Storage Policy:**
- **User Credentials**: Email addresses are stored. Passwords are hashed using bcrypt.
- **SMTP Credentials**: Stored encrypted using AES-256. The encryption key is never stored in the database.
- **Campaign Data**: Recipient email addresses and subject lines are stored to provide historical logs and analytics.

**Data Usage Policy:**
- **Inbox Access**: The application *does not* read your inbox. Its scope is strictly limited to *sending* emails via the provided SMTP credentials.
- **Tracking**: No personal browsing history is tracked. Open tracking provides only a timestamp and basic user agent string.
- **Third Parties**: No data is shared with third-party tracking services or ad networks.

**Self-Hosted Sovereignty:**
This application is designed for self-hosting. You retain full ownership and control mechanisms over your data.

---

*Documentation Updated - Dec 2025*
