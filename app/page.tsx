import { EmailForm } from "@/components/email-form"
import { Logo } from "@/components/logo"
import { AuthDialog } from "@/components/auth-dialog"
import { InfoFooter } from "@/components/info-footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">


      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">


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

