import { format as dateFnsFormat, isValid, parseISO } from 'date-fns';

/**
 * Format monetary values consistently across the application.
 * Defaults to INR (₹) with 2 decimal places.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string = 'INR'
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }

  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  
  // Format with Indian numbering system or standard 2 decimals
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return formatted;
}

/**
 * Format date values with fallback and consistent display format.
 * Default format: "dd MMM yyyy" (e.g., 01 Nov 2026)
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  formatPattern: string = 'dd MMM yyyy'
): string {
  if (!dateInput) return '—';

  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(d)) return '—';
    return dateFnsFormat(d, formatPattern);
  } catch {
    return '—';
  }
}

/**
 * Format relative time or datetime
 */
export function formatDateTime(
  dateInput: string | Date | null | undefined,
  formatPattern: string = 'dd MMM yyyy, hh:mm a'
): string {
  return formatDate(dateInput, formatPattern);
}

/**
 * Format regular integer or float quantities
 */
export function formatQuantity(qty: number | string | null | undefined): string {
  if (qty === null || qty === undefined || isNaN(Number(qty))) return '0';
  return Number(qty).toLocaleString('en-IN');
}

