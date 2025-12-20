import { EmailForm } from "@/components/email-form"
import { Logo } from "@/components/logo"
import { AuthDialog } from "@/components/auth-dialog"
import { InfoFooter } from "@/components/info-footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">


      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Header */}
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-8 py-12 md:py-16">
          {/* Logo */}
          <div className="relative h-28 w-28 md:h-32 md:w-32 transition-transform hover:scale-105 duration-500">
            <Logo className="w-full h-full drop-shadow-2xl" />
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-neutral-950 dark:text-white leading-[0.9]">
              IONOS <span className="text-neutral-400 font-bold">dMailer</span>
            </h1>
            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 font-medium tracking-tight">
              Professional SMTP Delivery Engine
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-4xl pt-4">
            {[
              { label: "SMTP Delivery", desc: "Direct Server Connection" },
              { label: "Smart Scheduling", desc: "Timed Campaigns" },
              { label: "Background Mode", desc: "Runs While Closed" },
              { label: "Real-time Tracking", desc: "Open & Click Analytics" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all duration-300 group"
              >
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white transition-colors">{item.label}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mt-1">{item.desc}</span>
              </div>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <EmailForm />
        </div>

        {/* Info Footer */}
        <InfoFooter />
      </div>
    </main>
  )
}

