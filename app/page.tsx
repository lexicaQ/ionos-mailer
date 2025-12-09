import { EmailForm } from "@/components/email-form"


export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-200 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-50 p-4 md:p-12 transition-colors duration-500">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex flex-col space-y-4 text-center items-center py-6">
          <div className="h-16 w-16 bg-black dark:bg-white rounded-xl flex items-center justify-center mb-4 shadow-lg animate-in zoom-in duration-500">
            <span className="text-white dark:text-black font-bold text-3xl">M</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 drop-shadow-sm">
            IONOS Mailer
          </h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
            Das professionelle Tool für sichere Serien-E-Mails. Konfigurieren Sie Ihre SMTP-Daten und starten Sie den Versand in Sekunden.
          </p>
        </header>

        <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-3xl p-1 shadow-sm">
          <EmailForm />
        </div>

        <footer className="text-center text-sm text-neutral-400 py-8">
          &copy; {new Date().getFullYear()} IONOS Mailer • Powered by Next.js & Antigravity
        </footer>
      </div>
    </main>
  )
}
