import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt", // Use JWT for credentials provider
        maxAge: 30 * 24 * 60 * 60, // 30 days - keep users logged in
        updateAge: 24 * 60 * 60, // Refresh token daily to prevent expiration during active use
    },
    pages: {
        signIn: "/", // Keep on main page, use modal
    },
    providers: [
        Credentials({
            id: "webauthn",
            name: "WebAuthn",
            credentials: {
                credential: { label: "Credential", type: "text" }
            },
            async authorize(credentials) {
                const credentialData = JSON.parse(credentials.credential as string)
                const { credential, challengeId } = credentialData
                const { verifyAuthenticationResponse } = await import("@simplewebauthn/server")

                // Validate challengeId is provided
                if (!challengeId) {
                    throw new Error("Challenge ID required")
                }

                // Decode credentialID to find the passkey
                const credentialID = credential.id

                // Find passkey and user
                const passkey = await prisma.passkey.findFirst({
                    where: { credentialId: credentialID },
                    include: { user: true }
                })

                if (!passkey || !passkey.user) {
                    throw new Error("Passkey not found")
                }

                // Find the challenge by ID (not "most recent" - prevents race conditions)
                const challenge = await prisma.authChallenge.findUnique({
                    where: { id: challengeId }
                })

                if (!challenge) {
                    throw new Error("Challenge not found")
                }

                if (challenge.expiresAt < new Date()) {
                    await prisma.authChallenge.delete({ where: { id: challengeId } }).catch(() => { })
                    throw new Error("Authentication timed out")
                }

                // Import config helper inside async function to avoid circular deps if any (though likely fine)
                const { getWebAuthnConfig } = await import("@/lib/webauthn-config")
                const { rpID, origin } = getWebAuthnConfig()

                let verification;
                try {
                    verification = await verifyAuthenticationResponse({
                        response: credential,
                        expectedChallenge: challenge.challenge,
                        expectedOrigin: origin,
                        expectedRPID: rpID,
                        authenticator: {
                            credentialID: Buffer.from(passkey.credentialId, 'base64url'),
                            credentialPublicKey: passkey.publicKey as any,
                            counter: Number(passkey.counter),
                            transports: passkey.transports as any[] // optional
                        },
                        requireUserVerification: true,
                    })
                } catch (error) {
                    console.error("WebAuthn verification failed:", error)
                    return null
                }

                if (verification.verified) {
                    const { authenticationInfo } = verification

                    // Update counter
                    await prisma.passkey.update({
                        where: { id: passkey.id },
                        data: {
                            counter: authenticationInfo.newCounter,
                            lastUsedAt: new Date()
                        }
                    })

                    // Delete challenge
                    await prisma.authChallenge.delete({ where: { id: challenge.id } })

                    return {
                        id: passkey.user.id,
                        email: passkey.user.email,
                        name: passkey.user.name,
                        image: passkey.user.image,
                    }
                }

                return null
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
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: email,
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
            if (session.user) {
                session.user.id = (token.id as string) || (token.sub as string)
            }
            return session
        }
    }
})
