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
    default: "IONOS Mailer | Professioneller E-Mail-Versand",
    template: "%s | IONOS Mailer"
  },
  description: "Die sichere Lösung für professionelles E-Mail-Marketing mit IONOS. DSGVO-konform, verschlüsselt und mit intelligentem Hintergrund-Versand für maximale Zustellbarkeit.",
  authors: [{ name: "Maxim Keibel" }],
  keywords: ["IONOS Mailer", "SMTP Versand", "Newsletter Tool", "Massenmail", "DSGVO konform", "E-Mail Automatisierung", "Next.js", "Serienbrief"],
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
    locale: "de_DE",
    url: "https://ionos-mailer.vercel.app",
    siteName: "IONOS Mailer Pro",
    title: "IONOS Mailer | Professionelles E-Mail-Marketing",
    description: "Versenden Sie Newsletter sicher und effizient über Ihren eigenen IONOS Account. Keine Limits, volle Kostenkontrolle.",
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
    description: "Sicheres E-Mail-Marketing ohne Abo-Kosten.",
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
    <html lang="de">
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
