import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { AutoThemeSwitcher } from "@/components/auto-theme-switcher"
import { Analytics } from "@vercel/analytics/next";
import { CSPostHogProvider } from "@/components/posthog-provider"

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black`}
      >

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CSPostHogProvider>
            <AutoThemeSwitcher />
            <ThemeToggle />
            {children}
            <Toaster />
            <Analytics />
          </CSPostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
