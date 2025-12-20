import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 24,
                    background: "black",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    borderRadius: 32,
                }}
            >
                <svg
                    width="100"
                    height="80"
                    viewBox="0 0 24 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect x="2" y="4" width="20" height="14" rx="2" />
                    <polyline points="22,6 12,13 2,6" />
                    {/* Lock symbol */}
                    <rect x="9" y="11" width="6" height="5" rx="1" />
                    <path d="M10 11V9a2 2 0 0 1 4 0v2" />
                </svg>
            </div>
        ),
        { ...size }
    )
}
