import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "IONOS Mailer | Professioneller E-Mail-Versand",
    template: "%s | IONOS Mailer"
  },
  description: "Sichere und effiziente Web-Applikation zum Versenden von Serien-E-Mails über IONOS SMTP. Mit Hintergrund-Versand, Zeitplanung und detailliertem Reporting.",
  authors: [{ name: "lexicaQ" }],
  keywords: ["IONOS", "SMTP", "Mailer", "E-Mail Marketing", "Newsletter", "Massenversand", "Next.js", "Vercel", "Email Automation"],
  creator: "lexicaQ",
  publisher: "lexicaQ",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "https://ionos-mailer.vercel.app",
    siteName: "IONOS Mailer",
    title: "IONOS Mailer | Professioneller E-Mail-Versand",
    description: "Sichere und effiziente Web-Applikation zum Versenden von Serien-E-Mails über IONOS SMTP.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IONOS Mailer - E-Mail Marketing Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IONOS Mailer | Professioneller E-Mail-Versand",
    description: "Sichere und effiziente Web-Applikation zum Versenden von Serien-E-Mails.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
