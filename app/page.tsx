import { EmailForm } from "@/components/email-form"
import { Logo } from "@/components/logo"
import { Lock, Zap, Clock, Eye } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-6 py-8">
          {/* Logo with subtle animation */}
          <div className="relative">
            <div className="h-24 w-24 text-black dark:text-white">
              <Logo className="w-full h-full" />
            </div>
            {/* Security badge */}
            <div className="absolute -bottom-1 -right-1 bg-neutral-900 dark:bg-white text-white dark:text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Lock className="h-2 w-2" />
              E2E
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-black dark:text-white">
              IONOS Mailer
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Secure Email Delivery • Your SMTP • Full Control
            </p>
          </div>

          {/* Feature Tags with Icons */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {[
              { label: "SMTP Delivery", icon: Zap },
              { label: "Scheduling", icon: Clock },
              { label: "Open Tracking", icon: Eye },
              { label: "AES-256 Encrypted", icon: Lock },
            ].map((item) => (
              <span
                key={item.label}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 rounded-full text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 flex items-center gap-2"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </span>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <EmailForm />
        </div>
      </div>
    </main>
  )
}
