# Changelog

All notable changes to the **IONOS Mailer** project will be documented in this file.

## [1.0.0] - 2025-12-24

### 🚀 Major Release: The Enterprise Foundation
Version 1.0.0 marks the first stable release of IONOS Mailer, a high-performance, self-hosted email marketing solution designed for privacy, security, and scalability. This release transitions the backend to a serverless-first architecture using **Neon** and introduces enterprise-grade security features.

### ✨ Key Features

#### 🔐 Zero-Trust Security Architecture
*   **End-to-End Encryption**: All sensitive data (SMTP credentials, recipient lists, drafts, campaign details) is encrypted at rest using **AES-256-GCM**.
*   **Passkey Authentication**: Added WebAuthn support for biometric login (FaceID, TouchID, Windows Hello), eliminating reliance on passwords.
*   **Privacy-Preserving Logs**: IP addresses are hashed with a secret pepper before storage to prevent user tracking while enabling abuse prevention.

#### ☁️ Serverless & Performance
*   **Neon Database Integration**: Fully migrated from standard Postgres to **Neon Serverless Postgres**.
*   **Smart "Scale-to-Zero"**: Background polling algorithms updated to an optimal **5-minute interval**, allowing the database to suspend during inactivity to minimize costs (Free Tier friendly).
*   **Instant Sync**: Live Tracker now uses dynamic short-polling (2-5s) only when active, reverting to cost-saving modes otherwise.

#### 📧 Advanced Sending Engine
*   **Reliable Background Jobs**: Decoupled sending logic triggered via external Cron (cron-job.org) ensures delivery even when the browser is closed.
*   **Draft Synchronization**: Real-time cloud sync for drafts allows seamless transitioning between desktop and mobile devices.
*   **Smart Validation**: New recipient validation UI prevents sending to invalid lists and blocks the UI until checks complete.

#### 🎨 UX & Theming
*   **Modern Interface**: Built with Tailwind CSS v4 and Shadcn/UI for a premium, accessible aesthetic.
*   **System Theme Sync**: Removed forced time-based theming in favor of respecting the user's OS preference (Light/Dark mode).
*   **Refined Layouts**: improved "Drafts" and "Settings" modals for better information density and eliminated layout shifts.

### 🛠 Technical Changes
*   **Framework**: Updated to Next.js 16 (App Router) with TurboPack.
*   **Database Schema**: Optimized Prisma schema for high-volume reads and batched writes.
*   **Documentation**: Comprehensive `README.md` update covering installation, serverless cost analysis, and operational guides.

---

*Verified by Maxim Keibel / Keibel Software*
