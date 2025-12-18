import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} from "@simplewebauthn/server"
import type {
    PublicKeyCredentialCreationOptionsJSON,
    RegistrationResponseJSON,
    AuthenticationResponseJSON
} from "@simplewebauthn/types"
import { prisma } from "@/lib/prisma"

// Relying Party configuration
const rpName = "IONOS Mailer"
const rpID = process.env.NODE_ENV === "production"
    ? "ionos-mailer.vercel.app"
    : "localhost"
const origin = process.env.NODE_ENV === "production"
    ? "https://ionos-mailer.vercel.app"
    : "http://localhost:3000"

// Generate registration options for a new passkey
export async function generatePasskeyRegistrationOptions(
    userId: string,
    userEmail: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: userId,
        userName: userEmail,
        userDisplayName: userEmail.split("@")[0],
        attestationType: "none",
        authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred",
            authenticatorAttachment: "platform",
        },
    })

    return options
}

// Verify registration response and save passkey
export async function verifyPasskeyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    deviceName?: string
): Promise<{ verified: boolean; passkeyId?: string }> {
    try {
        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        })

        if (!verification.verified || !verification.registrationInfo) {
            return { verified: false }
        }

        const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

        // Convert to base64 strings for storage
        const credentialIdBase64 = Buffer.from(credentialID).toString("base64url")
        const publicKeyBase64 = Buffer.from(credentialPublicKey).toString("base64")

        // Save the passkey to database
        const passkey = await prisma.passkey.create({
            data: {
                userId,
                credentialId: credentialIdBase64,
                publicKey: publicKeyBase64,
                counter: BigInt(counter),
                deviceName: deviceName || `${credentialDeviceType}${credentialBackedUp ? " (synced)" : ""}`,
            },
        })

        return {
            verified: true,
            passkeyId: passkey.id,
        }
    } catch (error) {
        console.error("Passkey verification error:", error)
        return { verified: false }
    }
}

// Generate authentication options for passkey login
export async function generatePasskeyAuthenticationOptions(userEmail: string) {
    const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: { passkeys: true },
    })

    if (!user || user.passkeys.length === 0) {
        return null
    }

    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
    })

    return { options, userId: user.id }
}

// Verify authentication response for passkey login
export async function verifyPasskeyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    userId: string
): Promise<{ verified: boolean }> {
    try {
        const credentialIdBase64 = response.id

        const passkey = await prisma.passkey.findFirst({
            where: {
                userId,
                credentialId: credentialIdBase64,
            },
        })

        if (!passkey) {
            return { verified: false }
        }

        // Convert stored base64 back to Uint8Array for verification
        const credentialPublicKey = Buffer.from(passkey.publicKey, "base64")

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: new Uint8Array(Buffer.from(passkey.credentialId, "base64url")),
                credentialPublicKey: new Uint8Array(credentialPublicKey),
                counter: Number(passkey.counter),
            },
        })

        if (verification.verified) {
            await prisma.passkey.update({
                where: { id: passkey.id },
                data: { counter: BigInt(verification.authenticationInfo.newCounter) },
            })
        }

        return { verified: verification.verified }
    } catch (error) {
        console.error("Passkey authentication error:", error)
        return { verified: false }
    }
}
