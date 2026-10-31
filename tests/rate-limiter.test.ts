import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limiter';

describe('In-Memory Rate Limiter', () => {
  it('should allow requests within threshold and block requests exceeding limit', () => {
    const key = `test-ip-${Date.now()}`;
    const max = 3;
    const windowSec = 10;

    // 1st request
    const r1 = checkRateLimit(key, max, windowSec);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    // 2nd request
    const r2 = checkRateLimit(key, max, windowSec);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    // 3rd request
    const r3 = checkRateLimit(key, max, windowSec);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request - should be blocked
    const r4 = checkRateLimit(key, max, windowSec);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});
