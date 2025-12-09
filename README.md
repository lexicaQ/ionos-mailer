# IONOS Mailer

Eine moderne Web-Applikation zum Versenden von E-Mails über einen IONOS-SMTP-Account. Entwickelt mit Next.js, React, Tailwind CSS und shadcn/ui.

## Features

- 📧 **SMTP-Versand**: Zuverlässiger Versand über IONOS SMTP.
- ✨ **Modernes UI**: Professionelles, minimalistisches Interface (Dark/Light Mode) mit Gradient-Design.
- ⏱️ **Zeitsteuerung**: Konfigurierbare Verzögerung zwischen E-Mails.
- 🕒 **Hintergrund-Modus (Offline)**: E-Mails über 12h+ verteilen (benötigt Datenbank).
- 📝 **E-Mail-Composer**: Editor für Betreff und Nachricht.
- 👥 **Massenversand**: Einfaches Einfügen von Empfängerlisten (Copy & Paste).
- ✅ **CSV Export**: Exportieren Sie Sendeberichte als CSV.
- 📊 **Status & History**: Live-Fortschrittsanzeige und Ergebnisübersicht.
- 🔒 **Sicherheit**: Credentials werden verschlüsselt oder im Browser gespeichert.

## Installation & Start

### 1. Voraussetzungen
- Node.js 18 oder höher
- Ein IONOS E-Mail-Konto (SMTP-Zugangsdaten)

### 2. Projekt installieren
```bash
npm install
# oder
pnpm install
```

### 3. Konfiguration
Die Zugangsdaten werden **direkt in der Web-Oberfläche** (Zahnrad-Symbol) eingegeben.
Es ist keine `.env` Datei mehr für SMTP-Daten nötig!

Für den **Hintergrund-Modus** (Vercel Deployment) benötigen Sie jedoch:
```env
# Nur für Datenbank & Encryption nötig
POSTGRES_URL=...
POSTGRES_PRISMA_URL=...
POSTGRES_URL_NON_POOLING=...
ENCRYPTION_KEY="langes-zufalls-passwort-32-zeichen"
CRON_SECRET="geheimes-cron-passwort"
```

> **Hinweis**: Bei Port 587 wird `SMTP_SECURE=false` gesetzt und STARTTLS verwendet. Falls Sie Port 465 nutzen möchten, setzen Sie `SMTP_SECURE=true`.

### 4. Starten (Entwicklung)
```bash
npm run dev
```
Die App ist nun unter [http://localhost:3000](http://localhost:3000) erreichbar.

### 5. Build & Produktion
Für den produktiven Einsatz:
```bash
npm run build
npm start
```

## Projektstruktur

- `/app`: Next.js App Router Pages & API
- `/components`: React UI Komponenten (shadcn/ui + Custom)
- `/lib`: Hilfsfunktionen (Mail-Service, Validierung)
- `/public`: Statische Assets

## Technologie-Stack

- **Framework**: Next.js 15+ (App Router)
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS
- **UI-Library**: shadcn/ui (Radix UI)
- **Formulare**: React Hook Form + Zod
- **Mail**: Nodemailer
