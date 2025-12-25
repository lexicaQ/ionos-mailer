import { Redis } from '@upstash/redis'

/**
 * Upstash Redis Client (Serverless)
 * 
 * Uses REST API for edge-compatible serverless functions.
 * Environment variables are auto-configured via Vercel integration.
 */
export const redis = Redis.fromEnv()

/**
 * Rate limiting helper using Redis
 * 
 * @param key - Unique identifier for rate limit (e.g., "rate-limit:test-connection:user123")
 * @param limit - Maximum requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns true if under limit, false if exceeded
 */
export async function checkRateLimit(
    key: string,
    limit: number = 5,
    windowSeconds: number = 60
): Promise<boolean> {
    try {
        const current = await redis.incr(key)

        // Set expiration on first request
        if (current === 1) {
            await redis.expire(key, windowSeconds)
        }

        return current <= limit
    } catch (error) {
        console.error('Redis rate limit error:', error)
        // Fail open on Redis errors (allow request)
        return true
    }
}

/**
 * Simple cache helper
 * 
 * @param key - Cache key
 * @param ttlSeconds - Time to live in seconds
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number = 300) {
    try {
        await redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
    } catch (error) {
        console.error('Redis cache set error:', error)
    }
}

/**
 * Get cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const value = await redis.get<string>(key)
        return value ? JSON.parse(value) : null
    } catch (error) {
        console.error('Redis cache get error:', error)
        return null
    }
}
