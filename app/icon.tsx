import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'black',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                }}
            >
                {/* Simplified envelope icon */}
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 100 100"
                    fill="none"
                >
                    <rect
                        x="10"
                        y="25"
                        width="80"
                        height="55"
                        rx="4"
                        stroke="white"
                        strokeWidth="6"
                    />
                    <path
                        d="M10 29L50 55L90 29"
                        stroke="white"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        ),
        { ...size }
    )
}
