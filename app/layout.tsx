import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileAuthToggle } from "@/components/mobile-auth-toggle"
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/auth-provider"
import { SecurityInfoPanel } from "@/components/security-info-panel"
import { CampaignPreloader } from "@/components/campaign-preloader"
import { OfflineIndicator } from "@/components/offline-indicator"
import { BotIdProtection } from "@/components/botid-protection"

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "IONOS Mailer | Professional Email Delivery",
    template: "%s | IONOS Mailer"
  },
  description: "The secure solution for professional email marketing with IONOS. GDPR-compliant, encrypted, and with intelligent background delivery for maximum deliverability.",
  authors: [{ name: "Maxim Keibel" }],
  keywords: ["IONOS Mailer", "SMTP Delivery", "Newsletter Tool", "Bulk Mail", "GDPR compliant", "Email Automation", "Next.js", "Mail Merge"],
  creator: "Maxim Keibel",
  publisher: "Maxim Keibel",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ionos-mailer.vercel.app",
    siteName: "IONOS Mailer Pro",
    title: "IONOS Mailer | Professional Email Marketing",
    description: "Send newsletters securely and efficiently via your own IONOS account. No limits, full cost control.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IONOS Mailer Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IONOS Mailer Pro",
    description: "Secure email marketing without subscription costs.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon",
    shortcut: "/favicon.ico",
    apple: "/apple-icon",
  },
  alternates: {
    canonical: "https://ionos-mailer.vercel.app",
  },
  applicationName: "IONOS Mailer Pro",
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "IONOS Mailer Pro",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Secure email marketing solution for IONOS users with background delivery and analytics.",
    "author": {
      "@type": "Person",
      "name": "Maxim Keibel"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is IONOS Mailer secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. All data is encrypted with AES-256-GCM, keys are derived using PBKDF2 with 100,000 iterations, and all connections use TLS with HSTS."
        }
      },
      {
        "@type": "Question",
        "name": "Is IONOS Mailer GDPR compliant?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Data is stored on EU servers, you can export or delete your data anytime, and no data is shared with third parties."
        }
      },
      {
        "@type": "Question",
        "name": "How does scheduling work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Campaigns are queued in the cloud and delivered via cron jobs that run every minute, even when your device is offline."
        }
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ThemeToggle />
            <MobileAuthToggle />
            <SecurityInfoPanel />
            <CampaignPreloader />
            {children}
            <OfflineIndicator />
            <Toaster />
            <Analytics />
            <BotIdProtection />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
