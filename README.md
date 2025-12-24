# IONOS Mailer

A professional, high-performance email marketing application designed for privacy, security, and scalability. Built on **Next.js 16**, **TypeScript**, and **PostgreSQL**, it offers a robust alternative to commercial SaaS platforms by leveraging your own SMTP infrastructure (IONOS, AWS SES, SendGrid, etc.) while ensuring strict data isolation and sovereignty.

This documentation serves as the comprehensive technical specification and operational guide.

---

## 1. System Architecture

**IONOS Mailer** functions as a secure, self-hosted middleware that orchestrates bulk email delivery through a background processing engine. It decouples the user interface from the sending logic to ensure reliability and performance.

### Core Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: PostgreSQL (Managed via Prisma ORM)
- **Authentication**: NextAuth.js v5 (Auth.js) with secure, HTTP-only JWT sessions
- **UI Architecture**: React Server Components (RSC) with Tailwind CSS v4 and Shadcn/UI
- **Cryptography**: Node.js Crypto Module (AES-256-GCM)

---

## 2. Feature Implementation

### 2.1 Smart Cloud Sync & Background Architecture
IONOS Mailer utilizes a modern, serverless-compatible architecture that ensures reliability even when the application frontend is closed.

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
-   **Authentication**: User passwords are hashed using **Bcrypt** (Salted, 10 rounds).
-   **Session Management**: Secure, HTTP-only cookies prevent XSS vectors.

### 2.3 Privacy-First Analytics
Analytics functionality provides actionable insights without compromising recipient privacy or relying on third-party tracking pixels.

-   **Open Tracking**: A proprietary 1x1 tracking pixel is injected into outgoing emails. Load events are captured by a dedicated API endpoint (`/api/track/open/...`) which records the timestamp and logs an "Opened" status in the `Job` table.
-   **Click Tracking**: Links are dynamically rewritten to route through the application (`/api/track/click/...`). This allows for capture of engagement metrics prior to a seamless 302 redirect.

### 2.4 Usage Limits & Fraud Prevention
To ensure platform stability and prevent abuse, a sophisticated limiting system is implemented for new accounts created after Dec 24, 2025.

-   **Freemium Model**: New users are limited to **100 emails pro month**. Legacy users remain unlimited.
-   **Multi-Vector Limit Enforcement**: Attempts to bypass limits are detected and blocked using a privacy-preserving fingerprinting system:
    -   **User ID Limit**: Basic account-level check.
    -   **IP Hash Limit**: Blocks creating multiple free accounts from the same IP address. The IP is **hashed (SHA-256)** with a secret pepper before storage, ensuring the raw IP is never readable in the database but can still be used for abuse detection.
    -   **SMTP User Hash Limit**: Blocks using the same IONOS credentials across multiple application accounts.
-   **Limit Notification**: Users are notified in the UI when they reach their limit, with a prompt to upgrade (future feature).

---

## 3. Data Sovereignty & Management

The application is strictly single-tenant logical storage. All data is scoped to the authenticated `User`. As a self-hosted solution, you maintain absolute ownership of your data.

### Data Storage Schema
| Data Point | Storage Mechanism | Access Level |
| :--- | :--- | :--- |
| **User Identity** | Plain Text (Email) | Application Login |
| **Authentication** | Bcrypt Hash | **Private** (Irreversible) |
| **SMTP Credentials** | AES-256 Encrypted | **Strictly Private** (Decrypted only in RAM) |
| **Recipient Info** | AES-256 Encrypted | **Strictly Private** (Privacy Protection) |
| **Tracking Logs** | Timestamp & IP | Analytics (Opened Status only) |

### Accessing Your Data Backend
Since there is no external vendor, you have direct access to the raw database.

#### Method 1: Prisma Studio (Recommended)
Prisma Studio provides a GUI for inspecting your database records.
1.  Navigate to the project root in your terminal.
2.  Execute: `npx prisma studio`
3.  Access the dashboard at `http://localhost:5555`.
    -   **Inspect Traffic**: View the `Job` table to see distinct recipients and timestamps.
    -   **Verify Security**: Inspect the `SmtpSettings` table to confirm that passwords are stored as encrypted cipherstrings.

#### Method 2: Database Provider Console
If hosted on managed infrastructure (Neon, Supabase, AWS RDS):
1.  Log in to your provider's console.
2.  Use the built-in SQL Editor or Table Explorer.

#### Method 3: SQL Client Connection
Connect via any standard PostgreSQL client (TablePlus, DBeaver, Postico).
-   **Connection String**: Use the `POSTGRES_URL` defined in your environment variables.

---

## 4. Installation & Deployment Guide

### 4.1 Prerequisites
-   **Node.js**: v18.17.0 (LTS) or higher.
-   **PostgreSQL Database**: A valid connection string (Local or Cloud-hosted).
-   **Git**: Version control system.

### 4.2 Local Environment Setup

1.  **Clone Repository**
    ```bash
    git clone https://github.com/your-org/ionos-mailer.git
    cd ionos-mailer
    ```

2.  **Install Dependencies**
    ```bash
    npm ci
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory. Populate it with the following secure configuration:

    ```env
    # Database Configuration
    # Use 'pgbouncer=true' for serverless environments (Neon/Supabase)
    POSTGRES_PRISMA_DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&pgbouncer=true"
    POSTGRES_URL="postgresql://user:pass@host:5432/db?sslmode=require"

    # Cryptographic Secrets
    # Generate these using `openssl rand -base64 32`
    AUTH_SECRET="<32-char-random-string>"
    ENCRYPTION_KEY="<32-char-random-string>" 
    CRON_SECRET="<secure-token-for-api-access>"

    # Application Domain
    NEXT_PUBLIC_BASE_URL="http://localhost:3000"
    ```

4.  **Database Initialization**
    Push the schema to your PostgreSQL instance.
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

*Verified Documentation - Dec 2025*
