export function Logo({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Envelope base */}
            <rect
                x="10"
                y="25"
                width="80"
                height="55"
                rx="4"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
            />
            {/* Envelope flap lines */}
            <path
                d="M10 29L50 55L90 29"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Speed lines (sending animation effect) */}
            <line
                x1="95"
                y1="42"
                x2="108"
                y2="38"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <line
                x1="95"
                y1="52"
                x2="112"
                y2="52"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <line
                x1="95"
                y1="62"
                x2="108"
                y2="66"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            {/* @ symbol inside envelope */}
            <circle
                cx="50"
                cy="58"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
            <path
                d="M50 52V62C50 64 52 66 55 66C58 66 60 64 60 62V58C60 54 56.5 51 53 51C49.5 51 46 54 46 58C46 62 49.5 65 53 65"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    )
}
