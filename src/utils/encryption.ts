import crypto from "crypto"

const algorithm = "aes-256-gcm"

function getEncryptionKey(): Buffer {
    if (process.env.ENCRYPTION_KEY) {
        const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex")
        if (key.length !== 32) {
            throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)")
        }
        return key
    }

    console.warn("⚠️  No ENCRYPTION_KEY found. Using temporary key for development.")
    return crypto.randomBytes(32)
}

const secretKey = getEncryptionKey()

export function encrypt(text: string): string {
    try {
        const iv = crypto.randomBytes(16)

        const cipher = crypto.createCipheriv(algorithm, secretKey, iv)

        let encrypted = cipher.update(text, "utf8", "hex")
        encrypted += cipher.final("hex")

        const authTag = cipher.getAuthTag()

        return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted
    } catch (error: any) {
        throw new Error(`Encryption failed: ${error?.message || "Unknown error"}`)
    }
}

export function decrypt(encryptedData: string): string {
    try {
        const parts = encryptedData.split(":")
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted data format")
        }

        const iv = Buffer.from(parts[0], "hex")
        const authTag = Buffer.from(parts[1], "hex")
        const encrypted = parts[2]

        const decipher = crypto.createDecipheriv(algorithm, secretKey, iv)
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(encrypted, "hex", "utf8")
        decrypted += decipher.final("utf8")

        return decrypted
    } catch (error: any) {
        throw new Error(`Decryption failed: ${error?.message || "Unknown error"}`)
    }
}
