import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function getMasterKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (!raw) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY or SESSION_SECRET must be set to store service credentials');
  }
  const buf = Buffer.from(raw, raw.length === 64 && /^[0-9a-f]+$/i.test(raw) ? 'hex' : 'utf8');
  if (buf.length < 32) {
    return Buffer.concat([buf, Buffer.alloc(32)]).subarray(0, 32);
  }
  return buf.subarray(0, 32);
}

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export function encryptSecret(plain: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptSecret(payload: EncryptedSecret): string {
  const decipher = createDecipheriv(ALGO, getMasterKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function secretPrefix(secret: string): string {
  if (secret.length <= 12) return '••••';
  return `${secret.slice(0, 8)}…${secret.slice(-4)}`;
}
