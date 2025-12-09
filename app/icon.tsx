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
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 100 100"
                    fill="none"
                >
                    <rect
                        x="12"
                        y="28"
                        width="76"
                        height="50"
                        rx="4"
                        stroke="white"
                        strokeWidth="5"
                    />
                    <path
                        d="M12 32L50 55L88 32"
                        stroke="white"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <line x1="92" y1="45" x2="102" y2="42" stroke="white" strokeWidth="4" strokeLinecap="round" />
                    <line x1="92" y1="53" x2="105" y2="53" stroke="white" strokeWidth="4" strokeLinecap="round" />
                    <line x1="92" y1="61" x2="102" y2="64" stroke="white" strokeWidth="4" strokeLinecap="round" />
                </svg>
            </div>
        ),
        { ...size }
    )
}
