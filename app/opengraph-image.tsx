import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'IONOS Mailer - Professional Email Delivery'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#000000',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Logo Icon */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '120px',
                        height: '120px',
                        marginBottom: '40px',
                    }}
                >
                    <svg
                        width="100"
                        height="100"
                        viewBox="0 0 100 100"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {/* Envelope base */}
                        <rect x="10" y="30" width="60" height="45" rx="4" />
                        {/* Envelope flap */}
                        <path d="M10 34L40 55L70 34" />
                        {/* Arrow pointing up-right */}
                        <path d="M55 50L85 20M85 20L65 20M85 20L85 40" strokeWidth="4" />
                    </svg>
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        color: 'white',
                        marginBottom: 16,
                        lineHeight: 1,
                    }}
                >
                    IONOS Mailer
                </div>

                {/* Subtitle */}
                <div
                    style={{
                        fontSize: 28,
                        fontWeight: 400,
                        color: '#888888',
                        letterSpacing: '0.02em',
                        marginBottom: 50,
                    }}
                >
                    Professional Email Delivery
                </div>

                {/* Feature Tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {['SMTP', 'Scheduling', 'Tracking', 'Encryption'].map((tag) => (
                        <div
                            key={tag}
                            style={{
                                padding: '12px 28px',
                                background: 'transparent',
                                border: '2px solid #444444',
                                borderRadius: '100px',
                                fontSize: 18,
                                color: '#ffffff',
                                fontWeight: 600,
                                letterSpacing: '0.01em',
                            }}
                        >
                            {tag}
                        </div>
                    ))}
                </div>

                {/* Bottom Border */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 30,
                        fontSize: 16,
                        color: '#555555',
                        letterSpacing: '0.05em',
                    }}
                >
                    ionos-mailer.vercel.app
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}

