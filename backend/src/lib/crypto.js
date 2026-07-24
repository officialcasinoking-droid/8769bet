import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const SALT_LENGTH = 16
const TAG_LENGTH = 16
const ITERATIONS = 100000

function getMasterKey() {
  const secret = process.env.ENCRYPTION_MASTER_KEY || process.env.JWT_SECRET || 'dev-secret-change-in-production'
  return crypto.createHash('sha256').update(secret).digest()
}

function deriveKey(salt) {
  const masterKey = getMasterKey()
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256')
}

export function encryptPin(pin) {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    throw new Error('PIN must be exactly 6 digits')
  }

  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = deriveKey(salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const pinBuffer = Buffer.from(pin, 'utf8')
  const encrypted = Buffer.concat([cipher.update(pinBuffer), cipher.final()])
  const tag = cipher.getAuthTag()

  const combined = Buffer.concat([salt, iv, encrypted, tag])
  return combined.toString('base64')
}

export function decryptPin(encryptedPin) {
  try {
    const combined = Buffer.from(encryptedPin, 'base64')
    
    if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted data')
    }

    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = combined.subarray(combined.length - TAG_LENGTH)
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH, combined.length - TAG_LENGTH)

    const key = deriveKey(salt)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch (e) {
    throw new Error('Failed to decrypt PIN')
  }
}

export async function hashPin(pin) {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    throw new Error('PIN must be exactly 6 digits')
  }
  return bcrypt.hash(pin, 12)
}

export async function verifyPin(pin, hash) {
  if (!pin || !hash) return false
  return bcrypt.compare(pin, hash)
}

export function generateSecurePin() {
  return crypto.randomInt(100000, 999999).toString()
}

export function verifyPinFormat(pin) {
  return pin && pin.length === 6 && /^\d{6}$/.test(pin)
}