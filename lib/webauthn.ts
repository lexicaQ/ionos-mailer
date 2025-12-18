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

// Generate registration options for a new passkey
export async function generatePasskeyRegistrationOptions(
    userId: string,
    userEmail: string,
    rpID: string
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
    rpID: string,
    origin: string,
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
export async function generatePasskeyAuthenticationOptions(userEmail: string | undefined, rpID: string) {
    let allowCredentials: any[] | undefined = undefined

    // If email provided, finding specific user's passkeys (Non-resident key flow)
    if (userEmail) {
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: { passkeys: true },
        })

        if (!user || user.passkeys.length === 0) {
            // If user not found but email provided, we should probably fail or return empty to prevent enumeration?
            // Standard practice: return generic options or error. 
            // Here, returning null creates 404 in API, which is fine for now.
            return null
        }

        allowCredentials = user.passkeys.map(key => ({
            id: new Uint8Array(Buffer.from(key.credentialId, "base64url")),
            type: "public-key",
            transports: ["internal", "hybrid"], // Optional hints
        }))
    }

    const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
        allowCredentials,
        timeout: 60000,
    })

    // If we found a user, return their ID to store challenge specific to them.
    // If usernameless, we don't know the user yet. Challenge will be stored with a temp ID or generic key?
    // Actually, `startAuthentication` needs the challenge. We can store challenge keyed by...?
    // In API we generate a temporary ID if no userId exists.

    return {
        options,
        userId: userEmail ? (await prisma.user.findUnique({ where: { email: userEmail } }))?.id : undefined
    }
}

// Verify authentication response for passkey login
export async function verifyPasskeyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    rpID: string,
    origin: string
): Promise<{ verified: boolean; userId?: string; email?: string }> {
    try {
        const credentialIdBase64 = response.id

        // Find passkey by Credential ID (Unique)
        const passkey = await prisma.passkey.findUnique({
            where: { credentialId: credentialIdBase64 },
            include: { user: true }
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

            return {
                verified: true,
                userId: passkey.userId,
                email: passkey.user.email
            }
        }

        return { verified: false }
    } catch (error) {
        console.error("Passkey authentication error:", error)
        return { verified: false }
    }
}
