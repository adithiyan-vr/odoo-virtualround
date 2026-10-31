import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from '@/lib/auth-session';
import { Role } from '@/lib/constants/enums';

describe('JWT Session Management', () => {
  it('should sign and verify valid session payload', async () => {
    const payload = {
      sub: 'user-uuid-1234',
      email: 'admin@brightloop.io',
      name: 'Admin User',
      role: Role.ADMIN,
      customerId: null,
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe(payload.sub);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.name).toBe(payload.name);
    expect(verified?.role).toBe(Role.ADMIN);
  });

  it('should reject tampered token', async () => {
    const token = await createSessionToken({
      sub: 'user-uuid-5678',
      email: 'customer@brightloop.io',
      name: 'Customer User',
      role: Role.CUSTOMER,
      customerId: 'cust-uuid-123',
    });

    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.badsignature`;

    const verified = await verifySessionToken(tampered);
    expect(verified).toBeNull();
  });
});
