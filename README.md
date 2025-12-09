# IONOS Mailer

Eine moderne Web-Applikation zum Versenden von E-Mails über einen IONOS-SMTP-Account. Entwickelt mit Next.js, React, Tailwind CSS und shadcn/ui.

## Features

- 📧 **SMTP-Versand**: Zuverlässiger Versand über IONOS SMTP.
- ✨ **Modernes UI**: Professionelles, minimalistisches Interface (Dark/Light Mode).
- 📝 **E-Mail-Composer**: Editor für Betreff und Nachricht.
- 👥 **Massenversand**: Einfaches Einfügen von Empfängerlisten (Copy & Paste).
- ✅ **Validierung**: Automatische Prüfung und Deduplizierung von E-Mail-Adressen.
- 📊 **Status & History**: Live-Fortschrittsanzeige und Ergebnisübersicht.
- 🔒 **Sicherheit**: Keine Hardcoded Credentials (nur via `.env`).

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

### 3. Konfiguration (.env)
Erstellen Sie eine Datei `.env.local` im Hauptverzeichnis (kopieren Sie ggf. `.env.example`) und tragen Sie Ihre IONOS-Daten ein:

```env
SMTP_HOST=smtp.ionos.de
SMTP_PORT=587
SMTP_USER=ihre-email@ionos.de
SMTP_PASS=ihr-passwort
SMTP_SECURE=false
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
