import { Decimal } from 'decimal.js';

export { Decimal };

export function toDecimal(value: string | number | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined) {
    return new Decimal(0);
  }
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value);
}

export function round2(value: string | number | Decimal): Decimal {
  const dec = toDecimal(value);
  return dec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function formatMoney(value: string | number | Decimal, currency = 'INR'): string {
  const num = toDecimal(value).toNumber();
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}
