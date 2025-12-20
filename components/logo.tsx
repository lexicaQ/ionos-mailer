export function Logo({ className = "" }: { className?: string }) {
    return (
        <div className={className}>
            {/* Light mode: black logo on light background */}
            <img
                src="/logo-light.png"
                alt="IONOS Mailer"
                className="w-full h-full object-contain dark:hidden"
            />
            {/* Dark mode: white logo on dark background */}
            <img
                src="/logo-dark.png"
                alt="IONOS Mailer"
                className="w-full h-full object-contain hidden dark:block"
            />
        </div>
    )
}

