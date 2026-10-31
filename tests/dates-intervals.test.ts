import { describe, it, expect } from 'vitest';
import { addInterval, formatCalendarDate } from '@/lib/dates';
import { BillingInterval } from '@/lib/constants/enums';

describe('Interval & Date Math', () => {
  it('should advance daily intervals correctly', () => {
    const start = new Date(Date.UTC(2026, 0, 15)); // Jan 15, 2026
    const next = addInterval(start, BillingInterval.DAILY, 1);
    expect(formatCalendarDate(next)).toBe('2026-01-16');

    const plus5 = addInterval(start, BillingInterval.DAILY, 5);
    expect(formatCalendarDate(plus5)).toBe('2026-01-20');
  });

  it('should advance weekly intervals correctly', () => {
    const start = new Date(Date.UTC(2026, 0, 15)); // Jan 15, 2026
    const next = addInterval(start, BillingInterval.WEEKLY, 1);
    expect(formatCalendarDate(next)).toBe('2026-01-22');
  });

  it('should advance monthly intervals with month-end clamping (Jan 31 -> Feb 28)', () => {
    const jan31 = new Date(Date.UTC(2026, 0, 31)); // Jan 31, 2026 (non-leap year)
    const nextMonth = addInterval(jan31, BillingInterval.MONTHLY, 1);
    expect(formatCalendarDate(nextMonth)).toBe('2026-02-28');
  });

  it('should advance yearly intervals correctly', () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const nextYear = addInterval(start, BillingInterval.YEARLY, 1);
    expect(formatCalendarDate(nextYear)).toBe('2027-01-01');
  });
});
