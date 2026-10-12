import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../schemas/auth.schema';

describe('Auth validation schemas', () => {
  it('validates correct registration payload', () => {
    const valid = {
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
    };
    expect(() => registerSchema.validateSync(valid)).not.toThrow();
  });

  it('rejects weak passwords missing uppercase or number', () => {
    expect(() =>
      registerSchema.validateSync({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      }),
    ).toThrow(/Password must contain at least one uppercase letter/);

    expect(() =>
      registerSchema.validateSync({
        email: 'test@example.com',
        password: 'Password',
        name: 'Test User',
      }),
    ).toThrow(/Password must contain at least one number/);
  });

  it('validates login payload', () => {
    expect(() =>
      loginSchema.validateSync({
        email: 'test@example.com',
        password: 'anypassword',
      }),
    ).not.toThrow();
  });

  it('validates forgot and reset password payloads', () => {
    expect(() => forgotPasswordSchema.validateSync({ email: 'test@example.com' })).not.toThrow();

    expect(() =>
      resetPasswordSchema.validateSync({
        token: 'valid-reset-token',
        newPassword: 'NewPassword123',
      }),
    ).not.toThrow();

    expect(() =>
      changePasswordSchema.validateSync({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
      }),
    ).not.toThrow();
  });
});
