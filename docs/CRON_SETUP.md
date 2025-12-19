# Background Email Processing Setup

## Problem

Vercel Hobby plan only allows cron jobs to run **once per day**. To send campaign emails every 5 minutes while the app is closed, you need an external trigger.

## Solution: GitHub Actions (Primary)

The repository already has a GitHub Actions workflow that runs every 5 minutes. To make it work:

### 1. Enable GitHub Actions Schedules

GitHub **disables scheduled workflows** on repositories with no activity for 60 days. To enable:
1. Go to your repo on GitHub
2. Click "Actions" tab
3. If you see a yellow banner saying workflows are disabled, click "I understand my workflows, go ahead and enable them"

### 2. Configure GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions → New repository secret**

Add these 3 secrets:

| Secret Name | Value | Where to find it |
|-------------|-------|------------------|
| `APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `CRON_SECRET` | Any random string (e.g., `my-secret-123`) | You create this, must match Vercel env |
| `VERCEL_PROTECTION_BYPASS` | Protection bypass secret | See step 3 below |

### 3. Get Vercel Protection Bypass Secret

1. Go to **Vercel → Your Project → Settings → Deployment Protection**
2. Scroll down to **"Protection Bypass for Automation"**
3. Click "Generate" if not already generated
4. Copy the secret value
5. Add it as `VERCEL_PROTECTION_BYPASS` in GitHub Secrets

### 4. Set CRON_SECRET in Vercel

1. Go to **Vercel → Your Project → Settings → Environment Variables**
2. Add: `CRON_SECRET` = same value you used in GitHub Secrets
3. Redeploy your app

### 5. Test Manually

1. Go to GitHub → Actions → "Process Email Queue"
2. Click "Run workflow" → "Run workflow"
3. Check the logs for success/failure

## Alternative: External Cron Service (cron-job.org)

If GitHub Actions doesn't work reliably, use a free external cron service:

### Setup on cron-job.org

1. Go to [cron-job.org](https://cron-job.org) and create free account
2. Click "Create cronjob"
3. Configure:
   - **Title**: IONOS Mailer Cron
   - **URL**: `https://your-app.vercel.app/api/cron/process`
   - **Schedule**: Every 5 minutes
   - **Request Method**: GET
   - **Headers** (click "Advanced"):
     - `x-manual-trigger`: `true`
     - `x-vercel-protection-bypass`: (your bypass secret from Vercel)
4. Save and enable

## Troubleshooting

### Cron not running?
1. Check GitHub Actions logs for errors
2. Verify all 3 secrets are set correctly
3. Make sure workflow isn't disabled

### Getting 401 Unauthorized?
1. Check `CRON_SECRET` matches in both GitHub and Vercel
2. Check `VERCEL_PROTECTION_BYPASS` is correct
3. Try disabling Vercel Deployment Protection temporarily to test

### Emails still not sending?
1. Check Vercel function logs at: Vercel → Project → Logs
2. Look for errors in email sending
3. Verify SMTP settings are correct

## How It Works

```
┌─────────────────┐
│ GitHub Actions  │  ──(every 5 min)──▶  POST /api/cron/process
└─────────────────┘                              │
                                                 ▼
┌─────────────────┐                    ┌─────────────────┐
│ cron-job.org    │  ──(backup)──────▶ │   Your Vercel   │
└─────────────────┘                    │   Application   │
                                       └─────────────────┘
┌─────────────────┐                              │
│  Vercel Cron    │  ──(once/day on Hobby)────▶  │
└─────────────────┘                              │
                                                 ▼
                                       ┌─────────────────┐
                                       │  Send Emails    │
                                       └─────────────────┘
```
