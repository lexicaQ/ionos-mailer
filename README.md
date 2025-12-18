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

### 2.1 Advanced Sending Engine & Cron Architecture
The application implements a creative work-around to bypass serverless execution limits (like Vercel's 10s or 60s timeout).
- **The Problem**: Sending 1000 emails takes time (e.g., 10 minutes). Serverless functions die after 10-60 seconds.
- **The Solution**: **Recursive Self-Calling API**.
    1.  User starts campaign -> Jobs saved as `PENDING`.
    2.  Cron hits `/api/cron/process`.
    3.  Worker wakes up, grabs 20 jobs, sends them.
    4.  Worker checks: "Are there more jobs?"
    5.  **Yes**: Worker sends a fetch request to *itself* (spawning a fresh worker) and then dies strictly before the timeout.
    6.  **No**: Worker retires.
- **Benefit**: Unlimited sending duration on free-tier serverless infrastructure.

### 2.2 Security & Encryption: "Zero-Trust" Storage
We assume the database could be compromised and design accordingly.
- **SMTP Credentials**: Your SMTP password is **never** stored in plain text.
    - **Algorithm**: AES-256-GCM (Galois/Counter Mode) - the gold standard.
    - **Key Derivation**: We use PBKDF2 to derive a key from your secret + a random salt.
    - **Storage**: We store `salt:iv:authTag:encryptedCiphertext`. If hackers steal the DB, they cannot decrypt it without the `ENCRYPTION_KEY` (which lives in Vercel/Env, not the DB).
- **User Passwords**: Hashed using `bcrypt` (Salted, 10 rounds).

### 2.3 Analytics: Privacy-First
- **Open Tracking**: An invisible 1x1 pixel is injected. Loading it triggers a DB update: `openedAt = NOW()`.
- **Link Tracking**: Links are rewritten to `yourdomain.com/api/track/click?url=...`. We log the click, then instantly redirect (302) the user.

---

## 3. Data Architecture & Transparency

The database schema is designed for strict multi-tenancy. Every record is scoped to a specific `User`.

### Transparency Report: What We Store
| Data Point | Storage Method | Purpose |
| :--- | :--- | :--- |
| **Email Address** | Plain Text | User Identification (Login). |
| **Login Password** | Bcrypt Hash | Secure Authentication. We cannot see your password. |
| **SMTP Password** | AES-256 Encrypted | Sending emails. Decrypted *only* in ephemeral RAM during sending. |
| **Recipient Data** | Plain Text | Required for delivery and history logs. |
| **Tracking Data** | Timestamp & IP | Analytics (Who opened, when). |

### **How to View Your Data (Backend Access)**
Since you are self-hosting this application, **YOU** are the owner of the database. There is no external "IONOS Mailer" website that holds your data. It lives wherever you set up your database.

Here are the 3 ways to view raw data (IPs, Emails, Logs):

#### **Option 1: The Easiest Way (Prisma Studio)**
This built-in tool launches a beautiful administrative dashboard on your computer.
1.  Open your terminal in the project folder.
2.  Run: `npx prisma studio`
3.  A browser tab will open at `http://localhost:5555`.
4.  **What you can see**:
    -   **`User` Table**: See all registered users.
    -   **`Campaign` / `Job` Table**: See every email sent, including the **Recipient Email** and **Opened At** timestamp.
    -   **`Click` Table**: (If applicable) See the **IP Address** and **User Agent** of people who clicked links.

#### **Option 2: Your Database Provider**
If you hosted your database on **Neon.tech** or **Supabase**:
1.  Go to the website (e.g., neon.tech) and log in.
2.  Click on your project.
3.  Go to the **"Tables"** or **"Editor"** tab.
4.  You can browse raw SQL tables directly in their browser UI.

#### **Option 3: PRO Way (SQL Client)**
Use a professional database tool like **TablePlus**, **DBeaver**, or **Postico**.
1.  Create a new connection.
2.  Use the `POSTGRES_URL` from your `.env` file.
3.  Connect and browse tables manually.


---

## 4. Installation & Deployment (Beginner Friendly)

This guide assumes you have basic familiarity with the terminal.

### 4.1 Prerequisites
1.  **Node.js**: Install [Node.js](https://nodejs.org/) (Version 18 or higher).
2.  **Git**: Install [Git](https://git-scm.com/).
3.  **PostgreSQL**: You need a database.
    -   **Easiest (Cloud)**: Create a free project on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com). Copy the "Connection String".
    -   **Local**: Install PostgreSQL locally.

### 4.2 Step-by-Step Setup

1.  **Download the Code**
    Open your terminal/command prompt.
    ```bash
    git clone https://github.com/your-org/ionos-mailer.git
    cd ionos-mailer
    ```

2.  **Install Libraries**
    This downloads all the toolsets (Next.js, React, Cryptography tools).
    ```bash
    npm install
    ```

3.  **Configure Secrets (.env)**
    -   Create a new file named `.env` in the folder.
    -   Copy the text below into it. Fill in your details.
    ```env
    # 1. Database Connection (From Neon/Supabase/Local)
    POSTGRES_PRISMA_DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
    POSTGRES_URL="postgresql://user:password@host:port/database?sslmode=require"

    # 2. Security Keys (mash your keyboard to make these unique)
    AUTH_SECRET="random-string-at-least-32-chars-long"
    ENCRYPTION_KEY="random-string-at-least-32-chars-long" 
    CRON_SECRET="another-random-password-for-cron"

    # 3. App URL (Use localhost for now)
    NEXT_PUBLIC_BASE_URL="http://localhost:3000"
    ```

4.  **Setup Database**
    This command connects to your DB and creates the tables (User, Campaign, etc.).
    ```bash
    npx prisma db push
    ```

5.  **Run the App**
    ```bash
    npm run dev
    ```
    -   Open `http://localhost:3000` in your browser.
    -   Log in with *any* email/password (the first time you login, it creates your account).

---

## 5. Deployment to Production (Vercel)

1.  Push your code to [GitHub](https://github.com).
2.  Go to [Vercel.com](https://vercel.com) -> "Add New Project" -> Import your repo.
3.  **Environment Variables**:
    -   Vercel will ask for Environment Variables.
    -   Copy-paste the contents of your `.env` file into the Vercel fields.
4.  **Deploy**: Click "Deploy".
5.  **Final Step (CRITICAL): Setup Cron Job**
    -   For the app to send emails in the background, you need to "poke" it every minute.
    -   Use a service like **GitHub Actions**, **EasyCron**, or **Vercel Cron**.
    -   Target URL: `https://your-site.vercel.app/api/cron/process`
    -   Header: `Authorization: Bearer YOUR_CRON_SECRET`

---

*Documentation Verified: Dec 2025 | Security Patch Level: Latest*
