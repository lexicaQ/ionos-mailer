import Image from "next/image"

export function Logo({ className = "" }: { className?: string }) {
    return (
        <div className={`relative ${className}`}>
            <Image
                src="/logo.png"
                alt="IONOS Mailer"
                fill
                className="object-contain" // Preserves aspect ratio
                priority
            />
        </div>
    )
}
