import { describe, it, expect } from 'vitest';
import { signUpSchema, signInSchema } from './schemas.js';

describe('auth schemas', () => {
  it('validates sign-up input', () => {
    const result = signUpSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      accountName: 'Acme Inc',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short passwords on sign-up', () => {
    const result = signUpSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'short',
      accountName: 'Acme Inc',
    });
    expect(result.success).toBe(false);
  });

  it('validates sign-in input', () => {
    const result = signInSchema.safeParse({
      email: 'jane@example.com',
      password: 'any',
    });
    expect(result.success).toBe(true);
  });
});
