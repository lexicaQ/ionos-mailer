import Image from "next/image"

export function Logo({ className = "" }: { className?: string }) {
    return (
        <div className={`relative ${className}`}>
            <Image
                src="/logo.png"
                alt="IONOS Mailer Logo"
                fill
                className="object-contain"
                priority
            />
        </div>
    )
}
