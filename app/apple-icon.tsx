import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
                    borderRadius: 40,
                }}
            >
                <svg
                    width="120"
                    height="120"
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
                        strokeWidth="4"
                    />
                    <path
                        d="M10 29L50 55L90 29"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <line
                        x1="95"
                        y1="42"
                        x2="108"
                        y2="38"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <line
                        x1="95"
                        y1="52"
                        x2="112"
                        y2="52"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <line
                        x1="95"
                        y1="62"
                        x2="108"
                        y2="66"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        ),
        { ...size }
    )
}
