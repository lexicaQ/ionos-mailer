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

### 2.1 Background Processing Engine (Recursive Workflows)
To overcome the execution time limits inherent in serverless environments (e.g., Vercel Functions), the application utilizes a **Recursive Cron Architecture**.

-   **Workflow Mechanism**:
    1.  **Job Queueing**: When a campaign starts, individual email tasks are generated in the `Job` table with a `PENDING` status.
    2.  **Trigger Execution**: A **GitHub Actions Workflow** (`.github/workflows/cron.yml`) periodically triggers the `/api/cron/process` endpoint.
    3.  **Batch Processing**: The endpoint spawns a worker that retrieves a batch of pending jobs (default: 20).
    4.  **Recursive Handoff**: Upon completing a batch, the worker checks for remaining jobs. If pending tasks exist, it self-initates a new asynchronous request to continue processing.
-   **Reliability**: This architecture guarantees that massive campaigns (10,000+ emails) are processed reliably without hitting server timeouts or memory limits.

### 2.2 Enterprise-Grade Security
Security is architected on a "Zero-Trust" model, assuming that the database layer could be theoretically compromised.

-   **Credential Encryption**: SMTP passwords are **never** stored in plain text.
    -   **Algorithm**: **AES-256-GCM** (Galois/Counter Mode).
    -   **Key Management**: The `ENCRYPTION_KEY` resides strictly in the runtime environment variables and is never persisted to the database.
    -   **Storage Format**: `salt:iv:authTag:ciphertext`. This ensures that even with database access, decryption is mathematically impossible without the separate environment key.
-   **Authentication**: User passwords are hashed using **Bcrypt** (Salted, 10 rounds).
-   **Session Management**: Secure, HTTP-only cookies prevent XSS vectors.

### 2.3 Privacy-First Analytics
Analytics functionality provides actionable insights without compromising recipient privacy or relying on third-party tracking pixels.

-   **Open Tracking**: A proprietary 1x1 tracking pixel is injected into outgoing emails. Load events are captured by a dedicated API endpoint (`/api/track/open/...`) which records the timestamp and logs an "Opened" status in the `Job` table.
-   **Click Tracking**: Links are dynamically rewritten to route through the application (`/api/track/click/...`). This allows for capture of engagement metrics prior to a seamless 302 redirect.

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

### 4.4 Configuring Background Jobs (GitHub Actions)
The application relies on **GitHub Actions** to trigger the sending engine. The workflow file is located at `.github/workflows/cron.yml`.

**Configuration:**
1.  Go to your GitHub Repository **Settings > Secrets and variables > Actions**.
2.  Add a new Repository Secret:
    -   **Name**: `CRON_SECRET`
    -   **Value**: Must match the `CRON_SECRET` in your Vercel Environment Variables.
3.  Add a Variable (or Secret):
    -   **Name**: `CRON_URL`
    -   **Value**: `https://your-production-domain.com/api/cron/process`

The workflow will ping your application every **10 minutes** to process queued campaigns.

---

*Verified Documentation - Dec 2025*
