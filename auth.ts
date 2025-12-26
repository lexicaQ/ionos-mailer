import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt", // Use JWT for credentials provider
        maxAge: 3650 * 24 * 60 * 60, // 10 years - effectively infinite login
        updateAge: 30 * 24 * 60 * 60, // Refresh token monthly (still active, just update occasionally)
    },
    pages: {
        signIn: "/", // Keep on main page, use modal
    },
    providers: [
        Credentials({
            id: "webauthn",
            name: "WebAuthn",
            credentials: {
                authToken: { label: "Auth Token", type: "text" }
            },
            async authorize(credentials) {
                // OPTIMIZED: Use pre-verified auth token instead of re-verifying passkey
                // This eliminates 4 DB queries and expensive cryptographic verification
                const { verifyAuthToken } = await import("@/lib/auth-token")
                const tokenData = await verifyAuthToken(credentials.authToken as string)

                if (!tokenData) {
                    throw new Error("Invalid or expired auth token")
                }

                // Simple DB query to get user info (verification already done!)
                const user = await prisma.user.findUnique({
                    where: { id: tokenData.userId }
                })

                if (!user) {
                    throw new Error("User not found")
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                }
            }
        }),
        Credentials({
            name: "ionos",
            credentials: {
                email: { label: "IONOS Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = (credentials.email as string)?.toLowerCase().trim()
                const password = credentials.password as string

                if (!email || !password) return null

                // Find existing user
                let user = await prisma.user.findUnique({
                    where: { email },
                })

                if (!user) {
                    // Auto-create user on first login
                    // Cost 8 = ~40ms (vs 10 = ~160ms) - still secure but faster on serverless
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: email,
                            passwordHash: await bcrypt.hash(password, 8),
                            emailVerified: new Date(),
                        }
                    })
                } else {
                    // Verify password
                    // Support both old `password` field (if exists) and new `passwordHash`
                    // But for this fix, we assume passwordHash is the main one or fallback

                    const hashToVerify = user.passwordHash || (user as any).password;

                    if (!hashToVerify) {
                        // Update/Set password if missing (cost 8 for speed)
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { passwordHash: await bcrypt.hash(password, 8) }
                        })
                    } else {
                        const isValid = await bcrypt.compare(password, hashToVerify)
                        if (!isValid) return null
                    }
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                }
            }
        })
    ],
    // Callbacks to ensure session has userId
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = (token.id as string) || (token.sub as string)
            }
            return session
        }
    }
})
