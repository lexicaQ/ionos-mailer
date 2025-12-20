import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle" // REMOVED implicit usage, but keeping file for now if needed by components
import { MobileAuthToggle } from "@/components/mobile-auth-toggle"
import { AutoThemeSwitcher } from "@/components/auto-theme-switcher"
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/auth-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

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

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TooltipProvider>
              <AutoThemeSwitcher />
              <MobileAuthToggle />
              {children}
              <Toaster />
              <Analytics />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
