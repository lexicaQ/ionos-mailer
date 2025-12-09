import { EmailForm } from "@/components/email-form"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-purple-950/10 text-neutral-900 dark:text-neutral-50 transition-colors duration-500">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-6 py-8">
          {/* Logo */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <div className="relative h-20 w-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-bold text-3xl tracking-tight">IM</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent">
              IONOS Mailer
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Professioneller E-Mail-Versand mit IONOS SMTP • Zeitplanung • Hintergrund-Modus
            </p>
          </div>
          
          {/* Stats Pills */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {[
              { label: "SMTP Versand", icon: "📧" },
              { label: "Zeitplanung", icon: "⏰" },
              { label: "Hintergrund-Modus", icon: "🌙" },
              { label: "Verschlüsselt", icon: "��" },
            ].map((item) => (
              <span 
                key={item.label}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
              >
                <span>{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl" />
          <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden">
            <EmailForm />
          </div>
        </div>
      </div>
    </main>
  )
}
