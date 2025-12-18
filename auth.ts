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

                if (!email || !password) return null

                // Find existing user
                let user = await prisma.user.findUnique({
                    where: { email },
                })

                if (!user) {
                    // Auto-create user on first login
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: email.split('@')[0],
                            passwordHash: await bcrypt.hash(password, 10),
                            emailVerified: new Date(),
                        }
                    })
                } else {
                    // Verify password
                    // Support both old `password` field (if exists) and new `passwordHash`
                    // But for this fix, we assume passwordHash is the main one or fallback

                    const hashToVerify = user.passwordHash || (user as any).password;

                    if (!hashToVerify) {
                        // Update/Set password if missing
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { passwordHash: await bcrypt.hash(password, 10) }
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
            if (session.user && token.id) {
                session.user.id = token.id as string
            }
            return session
        }
    }
})
