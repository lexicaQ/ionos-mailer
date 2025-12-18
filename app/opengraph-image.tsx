import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'IONOS Mailer - Professional Email Marketing'
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
                    backgroundColor: '#050505',
                    backgroundImage: 'radial-gradient(circle at 25px 25px, #202020 2%, transparent 0%), radial-gradient(circle at 75px 75px, #202020 2%, transparent 0%)',
                    backgroundSize: '100px 100px',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '140px',
                        height: '140px',
                        marginBottom: '40px',
                        borderRadius: '30px',
                        border: '1px solid #333',
                        background: 'linear-gradient(180deg, #1a1a1a 0%, #000 100%)',
                        boxShadow: '0 0 80px -20px rgba(255,255,255,0.1)',
                    }}
                >
                    <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                    }}
                >
                    <div
                        style={{
                            fontSize: 80,
                            fontWeight: 900,
                            letterSpacing: '-0.04em',
                            color: 'white',
                            marginBottom: 20,
                            lineHeight: 1,
                            textShadow: '0 0 40px rgba(255,255,255,0.2)',
                        }}
                    >
                        IONOS Mailer
                    </div>

                    <div
                        style={{
                            fontSize: 32,
                            fontWeight: 500,
                            color: '#888',
                            letterSpacing: '-0.02em',
                            marginBottom: 60,
                        }}
                    >
                        Professional Email Marketing & SMTP Analysis
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {['Secure', 'Analytics', 'Fast', 'SMTP'].map((tag) => (
                            <div
                                key={tag}
                                style={{
                                    padding: '10px 24px',
                                    background: '#111',
                                    border: '1px solid #222',
                                    borderRadius: '99px',
                                    fontSize: 18,
                                    color: '#ddd',
                                    fontWeight: 600,
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {tag}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Decorative Grid Overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent 0%, #333 50%, transparent 100%)',
                        opacity: 0.2,
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent 0%, #333 50%, transparent 100%)',
                        opacity: 0.2,
                    }}
                />
            </div>
        ),
        {
            ...size,
        }
    )
}
