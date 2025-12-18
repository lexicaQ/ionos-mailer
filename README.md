# IONOS Mailer

A production-grade, privacy-focused email marketing platform designed for high-performance self-hosting. Built on the modern Next.js 16 stack, it provides a secure, fully controlled alternative to commercial SaaS newsletter tools by leveraging your own SMTP infrastructure (IONOS, AWS SES, SendGrid, etc.).

This documentation details the system architecture, security implementation, data flow, and operational procedures for developers and system administrators.

---

## 1. System Overview

**IONOS Mailer** acts as a secure middleware between your browser and your email service provider. Unlike traditional desktop clients, it offloads the delivery process to a background server queue, allowing for reliable bulk sending without requiring an active browser session.

### Core Technologies
- **Application Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: PostgreSQL (Prisma ORM)
- **Authentication**: NextAuth.js v5 (Auth.js) with JWT Sessions
- **UI/UX**: React Server Components, Tailwind CSS v4, Shadcn/UI
- **Cryptography**: Node.js Crypto Module (AES-256-GCM)

---

## 2. Feature Specification

### 2.1 Advanced Sending Engine
The application implements a robust sending architecture designed to bypass serverless execution limits (e.g., Vercel's 10-second timeout).
- **Architecture**: A recursive, self-sustaining cron loop.
- **Process**:
    1.  User initiates campaign -> Jobs are created in DB (`PENDING` state).
    2.  Cron endpoint (`/api/cron/process`) is triggered.
    3.  Worker fetches a batch of `N` pending jobs.
    4.  Worker processes jobs sequentially with defined delays (Rate Limiting).
    5.  If more jobs exist, the worker calls itself recursively via HTTP fetch.
- **Reliability**: This ensures campaigns of arbitrary size (100 or 10,000 emails) complete reliable, regardless of host timeout policies.

### 2.2 Security & Encryption
Security is the primary design constraint. We assume the database could be compromised and design accordingly.
- **SMTP Credentials**: Your SMTP password is **never** stored in plain text.
    - **Algorithm**: AES-256-GCM (Galois/Counter Mode).
    - **Key Derivation**: PBKDF2 (100,000 iterations) with random 64-byte salt.
    - **Mechanism**: A unique Interaction Vector (IV) and Authentication Tag are generated for every encryption operation.
    - **Storage**: The `SmtpSettings` table stores the encrypted string (containing Salt, IV, Tag, and Ciphertext). The `ENCRYPTION_KEY` is stored only in environment variables, never in the DB.
- **User Passwords**: Hashed using `bcrypt` (Salted, 10 rounds).

### 2.3 Analytics & Tracking
Privacy-compliant tracking mechanisms provide campaign insights without invasive data collection.
- **Open Tracking**: An invisible 1x1 pixel is injected into the email body. When loaded, it hits the tracking endpoint, logging the timestamp and user agent.
- **Link Tracking**: All links in the email body are parsed and replaced with unique redirect URLs (`/api/track/click/...`). This captures the click event before 302 redirecting the user to the destination.
- **Data Model**: Tracking events are stored in the `Job` table (`openedAt`) and `Click` table (timestamp, url).

### 2.4 Smart Drafts & Placeholders
Content management utilizes a JSON-based storage format.
- **Context-Awareness**: The editor supports dynamic placeholders like `{{Company}}`.
- **Intelligent Fallback**: The sending engine inspects recipient data at runtime. If a placeholder value (e.g., Company Name) is missing, surrounding context words (like "at {{Company}}") are automatically stripped to prevent grammatical errors in the final email.
- **Logic**: Implemented via RegEx tokenization during the render phase of the sending pipeline.

---

## 3. Data Architecture (PostgreSQL)

The database schema is designed for strict multi-tenancy. Every record is scoped to a specific `User`.

### Key Tables
1.  **User**: Accounts and authentication data.
2.  **SmtpSettings**: (`userId` foreign key) Stores host, port, user, and encrypted password.
3.  **Draft**: (`userId` foreign key) Saved email templates with JSON-structured content.
4.  **Campaign**: (`userId` foreign key) Meta-container for a bulk send operation.
5.  **Job**: (`campaignId` foreign key) Individual email task. Stores recipient, personalized subject, status (`SENT`, `FAILED`, `PENDING`), and tracking data (`openedAt`).
6.  **SentEmail**: A historical archive table optimized for querying past activity.

**Data Sovereignty**: The database is yours. You can view it directly using any PostgreSQL client (e.g., TablePlus, DBeaver) by connecting to the `POSTGRES_PRISMA_DATABASE_URL`.

---

## 4. Installation & Deployment

### 4.1 Prerequisites
-   **Node.js**: v18.17.0 or newer.
-   **PostgreSQL**: v14+ (Local or Managed).
-   **Git**: For version control.
-   **SMTP Account**: Access to an SMTP server (Host, Port, User, Password).

### 4.2 Local Development Setup
1.  **Clone Source**:
    ```bash
    git clone https://github.com/your-org/ionos-mailer.git
    cd ionos-mailer
    ```
2.  **Install Dependencies**:
    ```bash
    npm ci
    ```
3.  **Environment Configuration**:
    Create `.env` in the root (do not commit this file).
    ```env
    # Database (Connection Pooling recommended for Serverless)
    POSTGRES_PRISMA_DATABASE_URL="postgresql://usr:pwd@host:5432/db?pgbouncer=true"
    POSTGRES_URL="postgresql://usr:pwd@host:5432/db"

    # Security Secrets (Must be random & kept secure)
    # Generate with: openssl rand -base64 32
    AUTH_SECRET="long_random_string_for_nextauth"
    ENCRYPTION_KEY="32_char_random_string_perfect_length"
    CRON_SECRET="random_token_for_api_protection"

    # App Config
    NEXT_PUBLIC_BASE_URL="http://localhost:3000"
    ```
4.  **Database Migration**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```
5.  **Start Application**:
    ```bash
    npm run dev
    ```
    Access via `http://localhost:3000`.

### 4.3 Production Deployment (Vercel)
1.  Push repository to GitHub.
2.  Import project into Vercel.
3.  Configure **Environment Variables** (copy from `.env`) in the Vercel Dashboard.
4.  **Critical**: Configure Cron Jobs.
    -   Vercel creates a `cron.json` automatically if present, or you can use a third-party cron service (e.g., GitHub Actions, EasyCron) to GET request `YOUR_DOMAIN/api/cron/process` every minute with the header `Authorization: Bearer YOUR_CRON_SECRET`.

---

## 5. Security Audit & Compliance

### What is stored?
| Data Point | Storage Method | Purpose |
| :--- | :--- | :--- |
| **Email Address** | Plain Text | User Identification (Login) |
| **Login Password** | Bcrypt Hash | Authentication |
| **SMTP Password** | AES-256 Encrypted | Sending emails on your behalf |
| **Recipient Data** | Plain Text | Delivery & History logs |
| **Tracking Data** | Timestamp & IP | Analytics reports |

### Verification
You can audit the backend logic by inspecting:
-   `auth.ts`: Authentication flows.
-   `lib/encryption.ts`: Cryptographic implementation.
-   `app/api/send-emails`: The core sending logic.
-   `middleware.ts`: Traffic filtering and bot protection rules.

---

*Verified Documentation - Dec 2025*
