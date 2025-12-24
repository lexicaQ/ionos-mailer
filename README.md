# IONOS Mailer

A professional, high-performance email marketing application designed for privacy, security, and scalability. Built on **Next.js 16**, **TypeScript**, and **Neon (Serverless PostgreSQL)**, it offers a robust alternative to commercial SaaS platforms by leveraging your own SMTP infrastructure (IONOS, AWS SES, SendGrid, etc.) while ensuring strict data isolation and sovereignty.

This documentation serves as the comprehensive technical specification and operational guide.

---

## 1. System Architecture

**IONOS Mailer** functions as a secure, self-hosted middleware that orchestrates bulk email delivery through a background processing engine. It decouples the user interface from the sending logic to ensure reliability and performance.

### Core Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: **Neon** (Serverless PostgreSQL)
- **ORM**: Prisma (for schema management & type safety)
- **Authentication**: NextAuth.js v5 (Auth.js) + **Passkeys (WebAuthn)**
- **UI Architecture**: React Server Components (RSC) with Tailwind CSS v4 and Shadcn/UI
- **Cryptography**: Node.js Crypto Module (AES-256-GCM) + Client-side encryption

---

## 2. Feature Implementation

### 2.1 Smart Cloud Sync & Background Architecture
IONOS Mailer utilizes a modern, serverless-compatible architecture that ensures reliability even when the application frontend is closed.

*   **Polling & Synchronization**: The application intelligently polls the database for changes.
    *   **Live Tracker**: When the live tracking modal is open, the frontend polls the backend every 2-5 seconds to provide near real-time updates.
    *   **Background Sync**: Every minute, the system reconciles local state with server state to ensure consistency across devices.
    *   **Optimization**: Polling intervals are dynamic. They back off when the tab is inactive to save resources and Neon compute units.
*   **External Cron Service (cron-job.org)**: The sending engine is triggered by an external cron service (cron-job.org) that calls the `/api/cron/process` endpoint every **1 minute**. This ensures emails are processed reliably without requiring the browser tab to remain open.
*   **Draft Cloud Sync**: Seamlessly synchronize your drafts across devices. Start writing on your desktop and finish on your mobile device. Changes are intelligently merged using a server-side resolution strategy. **Drafts are encrypted at rest.**

### 2.2 Enterprise-Grade Security
Security is architected on a "Zero-Trust" model, assuming that the database layer could be theoretically compromised.

-   **Comprehensive Encryption at Rest**: All sensitive data is encrypted using **AES-256-GCM**:
    -   **SMTP Credentials** (passwords, usernames)
    -   **Recipient Information** (email addresses)
    -   **Draft Content** (subject, body, recipients, attachments)
    -   **Campaign Data** (sender name, campaign name, attachment filenames)
    -   **Key Management**: The `ENCRYPTION_KEY` resides strictly in the runtime environment variables and is never persisted to the database.
    -   **Storage Format**: `salt:iv:authTag:ciphertext`. Decryption is mathematically impossible without the environment key.
-   **Authentication**:
    -   **Passkeys (WebAuthn)**: Support for passwordless biometric login (FaceID, TouchID, Windows Hello).
    -   **Fallback**: User passwords are hashed using **Bcrypt** (Salted, 10 rounds).
-   **Session Management**: Secure, HTTP-only cookies prevent XSS vectors.

### 2.3 Privacy-First Analytics
Analytics functionality provides actionable insights without compromising recipient privacy or relying on third-party tracking pixels.

-   **Open Tracking**: A proprietary 1x1 tracking pixel is injected into outgoing emails. Load events are captured by a dedicated API endpoint (`/api/track/open/...`) which records the timestamp and logs an "Opened" status in the `Job` table.
-   **Click Tracking**: Links are dynamically rewritten to route through the application (`/api/track/click/...`). This allows for capture of engagement metrics prior to a seamless 302 redirect.

### 2.4 Usage Limits & Fraud Prevention
To ensure platform stability and prevent abuse, a sophisticated limiting system is implemented for new accounts created after Dec 24, 2025.

-   **Freemium Model**: New users are limited to **100 emails per month**. Legacy users remain unlimited.
-   **Multi-Vector Limit Enforcement**: Attempts to bypass limits are detected and blocked using a privacy-preserving fingerprinting system:
    -   **User ID Limit**: Basic account-level check.
    -   **IP Hash Limit**: Blocks creating multiple free accounts from the same IP address. The IP is **hashed (SHA-256)** with a secret pepper before storage, ensuring the raw IP is never readable in the database but can still be used for abuse detection.
    -   **SMTP User Hash Limit**: Blocks using the same IONOS credentials across multiple application accounts.
-   **Limit Notification**: Users are notified in the UI when they reach their limit.

---

## 3. Data Sovereignty & Management

The application is strictly single-tenant logical storage. All data is scoped to the authenticated `User`. As a self-hosted solution, you maintain absolute ownership of your data.

### Data Storage Schema
| Data Point | Storage Mechanism | Access Level |
| :--- | :--- | :--- |
| **User Identity** | Plain Text (Email) | Application Login |
| **Authentication** | Bcrypt Hash / WebAuthn | **Private** (Irreversible) |
| **SMTP Credentials** | AES-256 Encrypted | **Strictly Private** (Decrypted only in RAM) |
| **Recipient Info** | AES-256 Encrypted | **Strictly Private** (Privacy Protection) |
| **Tracking Logs** | Timestamp & IP | Analytics (Opened Status only) |

### Accessing Your Data Backend
Since there is no external vendor, you have direct access to the raw database.

#### Method 1: Local GUI (Prisma Studio)
The included studio tool provides the easiest way to inspect your Neon data.
1.  Navigate to the project root in your terminal.
2.  Execute: `npx prisma studio`
3.  Access the dashboard at `http://localhost:5555`.

#### Method 2: Database Provider Console (Neon)
If hosted on Neon:
1.  Log in to the [Neon Console](https://console.neon.tech).
2.  Use the SQL Editor to query your tables directly.

---

## 4. Installation & Deployment Guide

### 4.1 Prerequisites
-   **Node.js**: v18.17.0 (LTS) or higher.
-   **Neon Database**: A [Neon](https://neon.tech) project (Free Tier is sufficient).
-   **Git**: Version control system.

### 4.2 Local Environment Setup

1.  **Clone Repository**
    ```bash
    git clone https://github.com/lexicaQ/ionos-mailer.git
    cd ionos-mailer
    ```

2.  **Install Dependencies**
    ```bash
    npm ci
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory. You must populate it with the following secure configuration:

    ```env
    # Database Configuration (Get string from Neon Dashboard)
    # MUST contain 'pgbouncer=true' for connection pooling support
    POSTGRES_PRISMA_DATABASE_URL="postgresql://user:pass@ep-xyz.region.neon.tech/neondb?sslmode=require&pgbouncer=true"
    POSTGRES_URL="postgresql://user:pass@ep-xyz.region.neon.tech/neondb?sslmode=require"

    # Cryptographic Secrets
    # Generate these using `openssl rand -base64 32`
    AUTH_SECRET="<32-char-random-string>"
    ENCRYPTION_KEY="<32-char-random-string>" 
    CRON_SECRET="<secure-token-for-api-access>"

    # Application Domain
    NEXT_PUBLIC_BASE_URL="http://localhost:3000"
    ```

4.  **Database Migration**
    Push the schema to your Neon instance.
    ```bash
    npx prisma db push
    ```

5.  **Start Development Server**
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:3000`.

### 4.3 Production Deployment (Vercel)

1.  **Push to GitHub**: Commit your changes to the `main` branch.
2.  **Import to Vercel**: Connect your GitHub repository.
3.  **Configure Environment**: Add all variables from your `.env` file to the Vercel Project Settings.
4.  **Deploy**: Initiate the build.

### 4.4 Configuring Background Jobs (cron-job.org)
The application uses an external cron service to trigger the email processing engine reliably.

**Setup (Free):**
1.  Create an account at [cron-job.org](https://cron-job.org).
2.  Create a new Cronjob with the following settings:
    -   **URL**: `https://your-production-domain.com/api/cron/process`
    -   **Schedule**: Every 1 minute
    -   **Request Method**: GET
3.  Under **Advanced > Headers**, add:
    -   **Key**: `Authorization`
    -   **Value**: `Bearer YOUR_CRON_SECRET` (must match your Vercel env variable)
4.  Save and activate the cronjob.

The service will ping your application every **1 minute** to process queued campaigns.

---

## 5. Operational Costs & Cron Intervals

When self-hosting, it's crucial to balance **responsiveness** (fast email sending) with **resource consumption** (database compute & serverless invocations).

### Cron Interval Impact Table
Calculations based on a standard 30-day month (43,200 minutes).

| Cron Interval | Invocations / Month | Responsiveness | Neon Compute (Est.) | Vercel Function Usage | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Minute** | **43,200** | Instant (Max delay 59s) | High (Prevents sleep) | High (~40% of Pro limit) | **Pro / High Volume** |
| **5 Minutes** | **8,640** | Good (Max delay 5m) | **Optimal** (Allows sleep) | Low (~8% of Hobby limit) | **Free Tier (Best)** |
| **15 Minutes** | **2,880** | Slow (Max delay 15m) | Low | Negligible | Low Volume / Backup |
| **30 Minutes** | **1,440** | Very Slow | Minimal | Negligible | Archival Only |

### Free Tier Limits (Reference)
*   **Neon Free Tier**: Offers **0.5 Compute Units (CU)**.
    *   *Polling every 1m* keeps the endpoint "warm", preventing the database from scaling down to zero effectively. This may consume your CU quota faster.
    *   *Polling every 5-10m* allows the database to "scale to zero" between requests, preserving credits.
*   **Vercel Hobby Tier**: Offers **100,000 Invocations** per month.
    *   A 1-minute cron uses ~43% of your entire monthly allowance just for checking the queue.
    *   **Recommendation**: Use **5 minutes** or higher intervals if you are on the Vercel Hobby plan.

---

*Documentation Version 1 - Dec 2025*
