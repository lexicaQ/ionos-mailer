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

3.  **Environment Configuration (Crucial Step)**
    This step connects your app to the database and secures it.
    
    1.  In your project folder (root), create a new file named `.env`.
    2.  Copy the template below and fill in the values using the **"Where to find?"** guide below.

    ```env
    # 1. DATABASE CONFIGURATION
    POSTGRES_PRISMA_DATABASE_URL="postgresql://..." # Needs ?pgbouncer=true
    POSTGRES_URL="postgresql://..."

    # 2. SECURITY SECRETS (You generate these)
    AUTH_SECRET="<generate-new>"
    ENCRYPTION_KEY="<generate-new>" 
    CRON_SECRET="<create-your-own>"

    # 3. APP URL
    NEXT_PUBLIC_BASE_URL="http://localhost:3000"
    ```
    
    ### 🕵️‍♂️ Where to find these values?

    **1. DATABASE URLs (`POSTGRES_...`)**
    *   Go to [Neon Console](https://console.neon.tech/app/projects).
    *   Select your project.
    *   On the **Dashboard**, look for **Connection Details**.
    *   **Important**: Check the box **"Pooled connection"** (top right of the code block).
    *   Copy the connection string.
    *   Paste it into *both* `POSTGRES_PRISMA_DATABASE_URL` and `POSTGRES_URL`.
    *   *Verify*: The URL should end with `?sslmode=require&pgbouncer=true` (or similar). If `pgbouncer=true` is missing from the first one, add it manually!

    **2. SECURITY SECRETS (`AUTH_` / `ENCRYPTION_KEY`)**
    *   These are master keys you create. Do not reuse keys from other projects.
    *   **Mac/Linux Terminal**: Run this command twice:
        ```bash
        openssl rand -base64 32
        ```
    *   Copy the output (a long random string) and paste it into `AUTH_SECRET` and `ENCRYPTION_KEY`.

    **3. CRON SECRET**
    *   Invent a secure password (e.g., `SecureCronTrigger2025!`).
    *   Paste it here. You will need this password later for Step 4.4.

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
3.  **Configure Environment**:
    *   Go to **Settings > Environment Variables** in your Vercel Project.
    *   Copy **ALL** contents from your local `.env` file.
    *   Paste them into the Vercel text area (it will automatically parse them).
    *   **Important**: Change `NEXT_PUBLIC_BASE_URL` to your actual Vercel domain (e.g., `https://my-mailer.vercel.app`).
4.  **Deploy**: Click "Deploy".

### 4.4 Troubleshooting
**Issue: "The app looks like broken HTML / No Styles" (Unstyled Content)**
*   **Cause**: This usually happens if dependencies weren't installed correctly or the CSS build failed.
*   **Fix**:
    1.  Stop the server (Ctrl+C).
    2.  Delete `node_modules` and `.next` folder: `rm -rf node_modules .next`
    3.  Reinstall cleanly: `npm ci` (Do not use `npm install` if `package-lock.json` exists)
    4.  Restart: `npm run dev`
    5.  Wait for the "Ready" message in the terminal before opening/refreshing the page.

### 4.4 Configuring Background Jobs (cron-job.org)
The application uses an external cron service to trigger the email processing engine reliably.

**Setup (Free):**
1.  Create an account at [cron-job.org](https://cron-job.org).
2.  Create a new Cronjob with the following settings:
    -   **URL**: `https://your-production-domain.com/api/cron/process`
    -   **Schedule**: Every 5 minutes (Recommended for Free Tiers)
    -   **Request Method**: GET
3.  Under **Advanced > Headers**, add:
    -   **Key**: `Authorization`
    -   **Value**: `Bearer YOUR_CRON_SECRET` (must match your Vercel env variable)
4.  Save and activate the cronjob.

The service will ping your application every **5 minutes** to process queued campaigns. This is the optimal balance for most users.

---

## 5. Serverless Economics & Operational Costs

When self-hosting on serverless infrastructure (Neon, Vercel), operational costs are driven by **Compute Time** (how long the server is active) and **Invocations** (how many times a function runs), rather than fixed monthly fees.

### 5.1 The "Scale-to-Zero" Mechanism
Serverless databases like Neon are designed to suspend operation ("sleep") after 5 minutes of inactivity. This "Scale-to-Zero" behavior is the primary mechanism for staying within Free Tier limits.

*   **Active State**: Updates, queries, or active connections cost **Compute Units (CU)**.
*   **Idle State**: After 5 minutes of no connections, the database suspends. Usage and cost drop to near zero.

### 5.2 Polling Frequency Analysis
The Cron Interval determines how often your application "wakes up" the database to check for pending emails. A high frequency (1 minute) prevents the inactivity timer from completing, keeping the resource perpetually active.

| Cron Interval | Invocations / Month | Database State | Active Hours / Month | Neon CU Consumption (Est.) | Vercel Function Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Minute** | 43,200 | **Always Active** | 720h (100%) | ~180 - 720 CU | ~43% of Free Tier |
| **5 Minutes** | 8,640 | **Oscillating** | ~50 - 100h | ~25 - 50 CU | ~8% of Free Tier |
| **10 Minutes** | 4,320 | **Mostly Idle** | < 20h | < 10 CU | ~4% of Free Tier |
| **60 Minutes** | 720 | **Deep Sleep** | < 2h | Negligible | < 1% of Free Tier |

> **Technical Note**: Continuous 1-minute polling is technically efficient but economically inefficient for low volumes, as it incurs the maximum possible availability cost regardless of actual usage.

### 5.3 Scenario-Based Recommendations
Choose your interval based on your actual volume and budget requirements.

| User Type | Email Volume | Recommended Interval | Estimated Cost | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Hobbyist / Dev** | < 500 / month | **5 - 10 Minutes** | **$0.00 (Free Tier)** | Maximizes "sleep time". Emails send within minutes, which is acceptable for newsletters/updates. |
| **Startup / SMB** | ~5,000 / month | **5 Minutes** | **$0.00 (Free Tier)** | Balances responsiveness with cost. High volume bursts (e.g. newsletter blast) are processed efficiently in one wake cycle. |
| **Enterprise** | > 50,000 / month | **1 Minute** | **$10 - $20 / month** | Requires continuous processing. The cost is justified by the need for instant transactional delivery. |

### 5.4 "Smart Batching" Efficiency
The application processes multiple emails per wake cycle, meaning "more emails" does not linearly equal "more server cost" if batching is efficient.

*   **Scenario A (Optimal)**: Cron runs every 5 minutes. It finds 50 pending emails. It processes all 50 in **one single wake cycle**. Compute cost is minimal relative to throughput.
*   **Scenario B (Inefficient)**: Cron runs every 1 minute. It finds 0 emails 4 times, then 10 emails once. It woke up 5 times for the same output. Compute cost is 5x higher for the same work.

**Conclusion**: Unless you require sub-minute latency for transactional emails (e.g., password resets), a **5-minute interval** is the mathematically optimal configuration for self-hosted deployments.

---

*Documentation Version 1 - Dec 2025*
