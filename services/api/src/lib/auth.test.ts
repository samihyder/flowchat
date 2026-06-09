import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './auth.js';

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('secure-password-123');
    expect(hash).not.toBe('secure-password-123');
    expect(await verifyPassword(hash, 'secure-password-123')).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });
});
