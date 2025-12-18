# IONOS Mailer

![IONOS Mailer Cover](./public/images/cover.png)

A professional, high-performance email marketing application designed for privacy, security, and ease of use. Built with **Next.js 16**, **TypeScript**, and **PostgreSQL**, it offers a robust alternative to expensive SaaS platforms by leveraging your own SMTP credentials (IONOS or any other provider).

---

## 🚀 Features

### 📨 Advanced Sending Engine
- **SMTP Integration**: Connects directly to your mail server (e.g., `smtp.ionos.de`).
- **Background Processing**: Uses a sophisticated **Serverless Cron** architecture to process campaigns in the background. You can close your browser once a campaign starts.
- **Rate Limiting**: Intelligent throttling (e.g., 500ms delay) to prevent spam flagging.
- **Smart Queue**: Automatically handles retries and failures.

### 📝 Smart Drafts & Editor
- **Rich Text Editor**: Support for **Bold**, *Italic*, Links, and more.
- **Context-Aware Placeholders**: 
  - `{{Company}}` or `at XXX` automatically detects user domains/companies.
  - If no company is found, generic "at XXX" text is automatically stripped to keep emails professional.
- **Cloud Sync**: Drafts are automatically synced to the database, ensuring you never lose work.
- **Preview Mode**: See exactly how your email will look, with placeholders resolved, before sending.

### 📊 Live Tracking & Analytics
- **Real-Time Dashboard**: Watch as emails go from *Pending* -> *Sent* -> *Opened*.
- **Open Tracking**: Invisible pixel tracking (privacy-compliant 1x1 GIF) detects open rates.
- **Link Tracking**: Automatically rewrites links to track clicks before redirecting.
- **Historical Logs**: Comprehensive history of every email sent, fully searchable.
- **Export**: detailed reports in **Excel (.xlsx)** or **PDF** (Black & White professional format).

### 🔒 Privacy & Security (Transparency)
We believe in full transparency regarding data handling.
- **Encryption**: SMTP passwords are encrypted using **AES-256-GCM** before being stored in the database.
- **Isolation**: Every user has a unique ID. Data is strictly siloed; you can never see another user's campaigns.
- **Bot Protection**: Middleware proactively blocks known scrapers (GPTBot, Ahrefs, etc.) to protect your tracking links.
- **No Third-Party Tracking**: We do not sell data. The application runs entirely on your infrastructure (Vercel + Neon DB).

---

## 🛠 System Architecture

### Backend
- **Framework**: Next.js 16 (App Router) with Server Actions.
- **Database**: PostgreSQL (managed via Prisma ORM).
- **Authentication**: NextAuth.js v5 (Auth.js) using secure HTTP-only sessions.
- **Cron System**: A recursive self-calling API (`/api/cron/process`) ensures long-running campaigns bypass Vercel's execution time limits.

### Frontend
- **UI Library**: Shadcn/UI + Radix Primitives for accessible, high-quality components.
- **Styling**: Tailwind CSS v4 with a strict **Monochrome (Black/White)** aesthetic.
- **State Management**: React Server Components + Client Hooks for real-time updates.

### Data Flow
1.  **User Login**: Authenticated via Email/Password. Session is stored in a secure cookie.
2.  **Campaign Start**: The frontend submits the job. The backend encrypts credentials and saves the job to Postgres.
3.  **Processing**: A background worker (triggered via Cron or API) fetches pending jobs, decrypts credentials in memory (never logged), sends the email via Nodemailer, and updates the DB status.
4.  **Sync**: Client regularly polls `/api/campaigns/status` for updates, ensuring the UI is always in sync with the server.

---

## 💻 Installation & Local Usage

Follow these instructions to run the application on your own machine.

### Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL Database** (Local or Cloud like Neon/Supabase)
- **Git**

### Step-by-Step Guide

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/ionos-mailer.git
    cd ionos-mailer
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add the following:
    ```env
    # Database Connection (Prisma)
    POSTGRES_PRISMA_DATABASE_URL="postgresql://user:password@host:port/db?sslmode=require"
    POSTGRES_URL="postgresql://user:password@host:port/db?sslmode=require"

    # Security (Generate random strings for these)
    AUTH_SECRET="your-random-auth-secret-32-chars"
    ENCRYPTION_KEY="your-random-32-char-string-for-aes"
    CRON_SECRET="your-random-secret-for-cron-protection"

    # App URL (For tracking links)
    NEXT_PUBLIC_BASE_URL="http://localhost:3000"
    ```

4.  **Initialize Database**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```

6.  **Access the App**
    Open your browser and navigate to `http://localhost:3000`.

### Production Deployment (Vercel)
This app is optimized for Vercel.
1.  Push your code to GitHub.
2.  Import the project in Vercel.
3.  Add the Environment Variables from Step 3.
4.  Deploy.
5.  **Critical**: Set up a Vercel Cron Job (or external cron) to hit `/api/cron/process` every minute to ensure background processing works reliably.

---

## 🛡️ Data Privacy Statement

**What We Store:**
- Your email address (for login).
- Hashed passwords (bcrypt).
- Encrypted SMTP credentials (AES-256).
- Campaign logs (recipient email, subject, status, open timestamps).

**What We Do NOT Store:**
- We do **not** access your inbox. Scope is limited to *sending* emails.
- We do **not** track your personal browsing history.
- Unencrypted passwords are **never** logged or stored.

**Transparency:**
This application is designed to be self-hosted. You own your data.

---

*Verified & Documentation Updated - Dec 2025*
