import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, formatQuantity } from '../src/lib/format';

describe('Frontend Formatting Utilities', () => {
  it('formats Indian Rupee currency correctly', () => {
    expect(formatMoney(1560)).toContain('1,560.00');
    expect(formatMoney('1560.5')).toContain('1,560.50');
    expect(formatMoney(0)).toContain('0.00');
    expect(formatMoney(null)).toContain('0.00');
  });

  it('formats dates consistently', () => {
    expect(formatDate('2026-11-01')).toBe('01 Nov 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
    expect(formatDate(null)).toBe('—');
  });

  it('formats quantities correctly', () => {
    expect(formatQuantity(5)).toBe('5');
    expect(formatQuantity(1000)).toBe('1,000');
    expect(formatQuantity(null)).toBe('0');
  });
});

