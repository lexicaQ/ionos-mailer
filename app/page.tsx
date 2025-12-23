import { EmailForm } from "@/components/email-form"
import { Logo } from "@/components/logo"

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-6 py-8">
          <div className="h-24 w-24 text-black dark:text-white">
            <Logo className="w-full h-full" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-black dark:text-white">
              IONOS Mailer
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Professional Email Delivery • SMTP • Scheduling • Tracking
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {["SMTP Delivery", "Scheduling", "Background Mode", "Open Tracking"].map((item) => (
              <span
                key={item}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 rounded-full text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800"
              >
                {item}
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
