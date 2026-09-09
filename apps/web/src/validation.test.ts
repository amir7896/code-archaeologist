import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './validation';

describe('auth validation', () => {
  it('requires name, email, and a long enough password on register', async () => {
    await expect(registerSchema.validate({ name: '', email: '', password: '' })).rejects.toThrow();
    await expect(
      registerSchema.validate({ name: 'Ada', email: 'not-an-email', password: 'password1' }),
    ).rejects.toThrow(/valid email/i);
    await expect(
      registerSchema.validate({ name: 'Ada', email: 'ada@example.com', password: 'short' }),
    ).rejects.toThrow(/at least 8/i);
    await expect(
      registerSchema.validate({ name: 'Ada', email: 'ada@example.com', password: 'password1' }),
    ).resolves.toMatchObject({ name: 'Ada', email: 'ada@example.com' });
  });

  it('requires a valid email on login', async () => {
    await expect(loginSchema.validate({ email: 'ada', password: 'password1' })).rejects.toThrow(
      /valid email/i,
    );
    await expect(
      loginSchema.validate({ email: 'ada@example.com', password: 'password1' }),
    ).resolves.toBeTruthy();
    await expect(
      loginSchema.validate({ email: 'ada@example.com', password: 'short' }),
    ).resolves.toBeTruthy();
  });
});
