import { addDays, addWeeks, addMonths, addYears, format, parseISO } from 'date-fns';
import { BillingInterval } from './constants/enums';

export function addInterval(anchor: Date, interval: BillingInterval, n: number): Date {
  const safeAnchor = new Date(anchor.getTime());
  switch (interval) {
    case 'DAILY':
      return addDays(safeAnchor, n);
    case 'WEEKLY':
      return addWeeks(safeAnchor, n);
    case 'MONTHLY':
      return addMonths(safeAnchor, n);
    case 'YEARLY':
      return addYears(safeAnchor, n);
    default:
      return addMonths(safeAnchor, n);
  }
}

export function todayInAppTz(): Date {
  // Use UTC calendar date so timezone does not drift day borders
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

export function toCalendarDate(dateInput: string | Date): Date {
  if (typeof dateInput === 'string') {
    // If it's YYYY-MM-DD
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(Date.UTC(year, month, day));
    }
    return parseISO(dateInput);
  }
  return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
}

export function formatCalendarDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
