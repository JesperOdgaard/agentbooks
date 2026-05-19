import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getEncKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (hex && hex.length >= 64) return Buffer.from(hex.slice(0, 64), 'hex')
  return Buffer.from('agentbooks-dev-key-pad-to-32-byte', 'utf8').slice(0, 32)
}

export function encryptKey(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', getEncKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}.${authTag.toString('hex')}.${encrypted.toString('hex')}`
}

export function decryptKey(encoded: string): string {
  const parts = encoded.split('.')
  if (parts.length !== 3) return encoded
  const [ivHex, authTagHex, encryptedHex] = parts
  const decipher = createDecipheriv('aes-256-gcm', getEncKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}
