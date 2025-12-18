import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'white',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 40,
                }}
            >
                <svg
                    width="200"
                    height="200"
                    viewBox="0 0 100 100"
                    fill="none"
                >
                    <rect
                        x="10"
                        y="25"
                        width="80"
                        height="55"
                        rx="4"
                        stroke="black"
                        strokeWidth="3"
                    />
                    <path
                        d="M10 29L50 55L90 29"
                        stroke="black"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <line
                        x1="95"
                        y1="42"
                        x2="108"
                        y2="38"
                        stroke="black"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    <line
                        x1="95"
                        y1="52"
                        x2="112"
                        y2="52"
                        stroke="black"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    <line
                        x1="95"
                        y1="62"
                        x2="108"
                        y2="66"
                        stroke="black"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                </svg>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 16,
                    }}
                >
                    <div
                        style={{
                            fontSize: 80,
                            fontWeight: 900,
                            color: 'black',
                            letterSpacing: -2,
                        }}
                    >
                        IONOS Mailer
                    </div>
                    <div
                        style={{
                            fontSize: 32,
                            color: '#666',
                        }}
                    >
                        Professioneller E-Mail-Versand mit SMTP & Tracking
                    </div>
                </div>
            </div>
        ),
        { ...size }
    )
}
