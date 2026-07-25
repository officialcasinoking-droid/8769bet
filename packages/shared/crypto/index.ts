import { subtle } from 'crypto';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

async function getMasterKey(): Promise<CryptoKey> {
  const secret = import.meta.env.VITE_ENCRYPTION_MASTER_KEY || 
                 import.meta.env.VITE_JWT_SECRET || 
                 'dev-secret-change-in-production';
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('8769bet-pin-salt'),
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPin(pin: string): Promise<string> {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    throw new Error('PIN must be exactly 6 digits');
  }

  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);

  const encrypted = await subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), IV_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptPin(encryptedPin: string): Promise<string> {
  try {
    const key = await getMasterKey();
    const combined = new Uint8Array(
      atob(encryptedPin).split('').map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    const decrypted = await subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    throw new Error('Failed to decrypt PIN');
  }
}

export async function hashPin(pin: string): Promise<string> {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    throw new Error('PIN must be exactly 6 digits');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const pinHash = await hashPin(pin);
  return pinHash === hash;
}

export function generateSecurePin(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function verifyPinFormat(pin: string): boolean {
  return pin.length === 6 && /^\d{6}$/.test(pin);
}