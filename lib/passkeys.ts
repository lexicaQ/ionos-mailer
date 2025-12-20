import {
    startRegistration,
    startAuthentication,
    browserSupportsWebAuthn
} from "@simplewebauthn/browser"

export { browserSupportsWebAuthn }

export interface PasskeyInfo {
    id: string
    name: string | null
    deviceType: string
    backedUp: boolean
    lastUsedAt: string | null
    createdAt: string
}

/**
 * Register a new passkey for the current user
 * @param deviceName Optional friendly name for the passkey
 * @returns true if successful
 */
export async function registerPasskey(deviceName?: string): Promise<boolean> {
    // Get registration options from server
    const optionsRes = await fetch("/api/passkeys/register-options", {
        method: "POST"
    })

    if (!optionsRes.ok) {
        const error = await optionsRes.json()
        throw new Error(error.error || "Failed to get registration options")
    }

    const options = await optionsRes.json()

    // Start WebAuthn registration ceremony
    let credential
    try {
        credential = await startRegistration(options)
    } catch (error: any) {
        if (error.name === "NotAllowedError") {
            throw new Error("Passkey creation was cancelled")
        }
        if (error.name === "InvalidStateError") {
            throw new Error("This passkey is already registered")
        }
        throw error
    }

    // Verify with server
    const verifyRes = await fetch("/api/passkeys/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...credential,
            deviceName
        })
    })

    const result = await verifyRes.json()

    if (!verifyRes.ok) {
        throw new Error(result.error || "Passkey registration failed")
    }

    return result.verified === true
}

/**
 * Authenticate with a passkey
 * @param email Optional email to filter allowed passkeys
 * @returns User info if successful
 */
export async function authenticateWithPasskey(email?: string): Promise<{
    verified: boolean
    user?: { id: string; email: string; name: string | null }
}> {
    // Get authentication options from server
    const optionsRes = await fetch("/api/passkeys/auth-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    })

    if (!optionsRes.ok) {
        const error = await optionsRes.json()
        throw new Error(error.error || "Failed to get authentication options")
    }

    const options = await optionsRes.json()

    // Start WebAuthn authentication ceremony
    let credential
    try {
        credential = await startAuthentication(options)
    } catch (error: any) {
        if (error.name === "NotAllowedError") {
            throw new Error("Passkey authentication was cancelled")
        }
        throw error
    }

    // Verify with server
    const verifyRes = await fetch("/api/passkeys/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential)
    })

    const result = await verifyRes.json()

    if (!verifyRes.ok) {
        throw new Error(result.error || "Passkey authentication failed")
    }

    return result
}

/**
 * Get passkey credential for NextAuth sign-in
 * Does NOT verify with the API route, but returns the credential to be sent to NextAuth
 */
export async function getPasskeyCredential(email?: string): Promise<any> {
    // Get authentication options
    const optionsRes = await fetch("/api/passkeys/auth-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    })

    if (!optionsRes.ok) {
        throw new Error("Failed to initialize passkey login")
    }

    const options = await optionsRes.json()

    // Start WebAuthn authentication ceremony
    try {
        const credential = await startAuthentication(options)
        return credential
    } catch (error: any) {
        if (error.name === "NotAllowedError") {
            throw new Error("Login cancelled")
        }
        throw error
    }
}

/**
 * Get list of user's passkeys
 */
export async function listPasskeys(): Promise<PasskeyInfo[]> {
    const res = await fetch("/api/passkeys")
    if (!res.ok) return []
    const data = await res.json()
    return data.passkeys || []
}

/**
 * Delete a passkey
 */
export async function deletePasskey(passkeyId: string): Promise<boolean> {
    const res = await fetch("/api/passkeys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkeyId })
    })
    return res.ok
}

/**
 * Rename a passkey
 */
export async function renamePasskey(passkeyId: string, name: string): Promise<boolean> {
    const res = await fetch("/api/passkeys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkeyId, name })
    })
    return res.ok
}
