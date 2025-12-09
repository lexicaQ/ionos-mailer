import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'IONOS Mailer - Professioneller E-Mail-Versand'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
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
                    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
                    fontFamily: 'system-ui',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 40,
                    }}
                >
                    <div
                        style={{
                            width: 120,
                            height: 120,
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                            borderRadius: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 64,
                            fontWeight: 'bold',
                            color: 'white',
                            marginRight: 30,
                        }}
                    >
                        IM
                    </div>
                    <div
                        style={{
                            fontSize: 72,
                            fontWeight: 'bold',
                            background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                            backgroundClip: 'text',
                            color: 'transparent',
                        }}
                    >
                        IONOS Mailer
                    </div>
                </div>
                <div
                    style={{
                        fontSize: 32,
                        color: '#a1a1aa',
                        textAlign: 'center',
                        maxWidth: 800,
                    }}
                >
                    Professioneller E-Mail-Versand über IONOS SMTP
                </div>
                <div
                    style={{
                        display: 'flex',
                        marginTop: 50,
                        gap: 20,
                    }}
                >
                    {['Massenversand', 'Zeitplanung', 'Hintergrund-Modus', 'Reporting'].map((feature) => (
                        <div
                            key={feature}
                            style={{
                                padding: '12px 24px',
                                background: 'rgba(99, 102, 241, 0.2)',
                                borderRadius: 9999,
                                color: '#a5b4fc',
                                fontSize: 20,
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                            }}
                        >
                            {feature}
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size }
    )
}
