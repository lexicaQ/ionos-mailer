import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
    process.env.PASSKEY_AUTH_SECRET || process.env.AUTH_SECRET || 'fallback-secret-change-in-production'
)

/**
 * Create a short-lived authentication token after successful passkey verification.
 * This token is used to avoid re-verifying the passkey in NextAuth's authorize function.
 * 
 * @param userId - The user's ID
 * @param challengeId - The challenge ID that was used for verification
 * @returns A signed JWT token valid for 30 seconds
 */
export async function createAuthToken(userId: string, challengeId: string): Promise<string> {
    return await new SignJWT({ userId, challengeId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30s') // Short-lived, single-use token
        .setIssuedAt()
        .sign(secret)
}

/**
 * Verify an authentication token created by createAuthToken.
 * 
 * @param token - The JWT token to verify
 * @returns The token payload if valid, null otherwise
 */
export async function verifyAuthToken(token: string): Promise<{ userId: string, challengeId: string } | null> {
    try {
        const { payload } = await jwtVerify(token, secret)
        return payload as { userId: string, challengeId: string }
    } catch (error) {
        console.error('Auth token verification failed:', error)
        return null
    }
}
