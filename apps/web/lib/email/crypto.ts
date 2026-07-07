import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const DEFAULT_KEY = 'truf-gaming-secret-encryption-key-32chars!' // 32 chars fallback

function getEncryptionKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY || DEFAULT_KEY
  return crypto.createHash('sha256').update(key).digest() // guarantees 32 bytes
}

export function encrypt(text: string): string {
  if (!text) return ''
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''
  const parts = encryptedText.split(':')
  if (parts.length !== 2) return ''

  const ivPart = parts[0]
  const encryptedPart = parts[1]
  if (!ivPart || !encryptedPart) return ''

  const iv = Buffer.from(ivPart, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  let decrypted = decipher.update(encryptedPart, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
