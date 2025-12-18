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
                    borderRadius: '22%',
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
                        strokeWidth="5"
                    />
                    <path
                        d="M10 29L50 55L90 29"
                        stroke="white"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        ),
        { ...size }
    )
}
