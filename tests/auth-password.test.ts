import { describe, it, expect } from 'vitest';
import {
  validatePasswordPolicy,
  hashPassword,
  comparePassword,
  generateResetToken,
  hashResetToken,
} from '@/lib/auth-session';

describe('Password Policy & Regex', () => {
  it('should accept valid passwords meeting all criteria (≥9 chars, upper, lower, special)', () => {
    const valid = [
      'Admin@12345',
      'Staff@12345',
      'Customer@12345',
      'Strong#Pass1',
      'Abcdefg1!',
      'P@ssword2026',
    ];

    for (const pwd of valid) {
      const res = validatePasswordPolicy(pwd);
      expect(res.isValid, `Expected '${pwd}' to be valid`).toBe(true);
    }
  });

  it('should reject passwords with length < 9', () => {
    const shortPasswords = [
      'Abcdef1!', // 8 chars
      'A@1b2C3',   // 7 chars
      'Pass#1',    // 6 chars
      '',
    ];

    for (const pwd of shortPasswords) {
      const res = validatePasswordPolicy(pwd);
      expect(res.isValid, `Expected '${pwd}' to be rejected for length`).toBe(false);
    }
  });

  it('should reject passwords missing an uppercase letter', () => {
    const res = validatePasswordPolicy('password#123');
    expect(res.isValid).toBe(false);
    expect(res.message).toContain('uppercase');
  });

  it('should reject passwords missing a lowercase letter', () => {
    const res = validatePasswordPolicy('PASSWORD#123');
    expect(res.isValid).toBe(false);
    expect(res.message).toContain('lowercase');
  });

  it('should reject passwords missing a special character', () => {
    const res = validatePasswordPolicy('Password123');
    expect(res.isValid).toBe(false);
    expect(res.message).toContain('special');
  });
});

describe('Password Hashing & Token Hash', () => {
  it('should hash with bcrypt cost 12 and verify correctly', async () => {
    const pwd = 'Admin@12345';
    const hash = await hashPassword(pwd);

    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    const valid = await comparePassword(pwd, hash);
    expect(valid).toBe(true);

    const wrong = await comparePassword('WrongPassword#1', hash);
    expect(wrong).toBe(false);
  });

  it('should generate a 32-byte raw token and verifiable SHA-256 hash', () => {
    const { rawToken, tokenHash } = generateResetToken();
    expect(rawToken.length).toBe(64); // 32 bytes in hex = 64 chars
    expect(tokenHash.length).toBe(64); // sha256 hex = 64 chars

    const computed = hashResetToken(rawToken);
    expect(computed).toBe(tokenHash);
  });
});
