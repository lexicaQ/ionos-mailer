import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt", // Use JWT for credentials provider
    },
    pages: {
        signIn: "/", // Keep on main page, use modal
    },
    providers: [
        Credentials({
            name: "ionos",
            credentials: {
                email: { label: "IONOS Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = (credentials.email as string)?.toLowerCase().trim()
                const password = credentials.password as string
                const loginToken = (credentials as any).loginToken as string | undefined

                if (!email) return null

                // Find existing user
                let user = await prisma.user.findUnique({
                    where: { email },
                })

                // Case 1: Passkey Login (using loginToken)
                if (loginToken && user) {
                    if (user.loginToken === loginToken &&
                        user.loginTokenExpires &&
                        user.loginTokenExpires > new Date()) {

                        // Clear token after use (single use)
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { loginToken: null, loginTokenExpires: null }
                        })

                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                        }
                    }
                    return null // Invalid token
                }

                // Case 2: Standard Password Login
                if (!password) return null

                if (user) {
                    // User exists - verify password
                    if (!user.passwordHash) {
                        // User exists but no password (shouldn't happen, but handle it)
                        const passwordHash = await bcrypt.hash(password, 12)
                        user = await prisma.user.update({
                            where: { email },
                            data: { passwordHash },
                        })
                    } else {
                        // Verify password matches
                        const isValid = await bcrypt.compare(password, user.passwordHash)
                        if (!isValid) {
                            return null // Wrong password
                        }
                    }
                } else {
                    // User doesn't exist - auto-create!
                    const passwordHash = await bcrypt.hash(password, 12)
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: email.split("@")[0], // Use email prefix as name
                            passwordHash,
                        },
                    })
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
            }
            return session
        },
    },
})
