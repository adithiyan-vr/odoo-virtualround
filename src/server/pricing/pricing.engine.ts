/**
 * Pricing Engine (pure)
 *
 * Computes per-line amounts and invoice totals.
 * Decimal-safe: all intermediate values stay as Decimal.
 *
 * Formula per line:
 *   amount      = round2(quantity × unitPrice)
 *   taxable     = max(0, amount − discountAmount)
 *   taxAmount   = round2(taxable × taxRate / 100)
 *   lineTotal   = taxable + taxAmount
 */

import { Decimal } from 'decimal.js';
import { round2, toDecimal } from '@/lib/money';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PricingLineInput {
  quantity: number;
  unitPrice: Decimal | number | string;
  discountAmount?: Decimal | number | string;   // default 0
  taxRate: Decimal | number | string;            // e.g. 18 for 18%
}

export interface PricingLineResult {
  amount: Decimal;          // gross (before discount)
  discountAmount: Decimal;
  taxable: Decimal;
  taxAmount: Decimal;
  lineTotal: Decimal;
}

export interface InvoiceTotals {
  subtotal: Decimal;        // Σ amount (gross, pre-discount)
  discountAmount: Decimal;  // Σ discountAmount
  taxAmount: Decimal;       // Σ taxAmount
  totalAmount: Decimal;     // Σ lineTotal
}

// ─── Line computation ────────────────────────────────────────────────────────

export function computeLine(input: PricingLineInput): PricingLineResult {
  const amount = round2(toDecimal(input.unitPrice).mul(input.quantity));
  const discountAmount = round2(toDecimal(input.discountAmount ?? 0));
  const taxable = Decimal.max(new Decimal(0), amount.sub(discountAmount));
  const taxAmount = round2(taxable.mul(toDecimal(input.taxRate)).div(100));
  const lineTotal = taxable.add(taxAmount);

  return { amount, discountAmount, taxable, taxAmount, lineTotal };
}

// ─── Invoice totals ──────────────────────────────────────────────────────────

export function computeInvoiceTotals(lines: PricingLineResult[]): InvoiceTotals {
  const subtotal       = lines.reduce((s, l) => s.add(l.amount),        new Decimal(0));
  const discountAmount = lines.reduce((s, l) => s.add(l.discountAmount), new Decimal(0));
  const taxAmount      = lines.reduce((s, l) => s.add(l.taxAmount),     new Decimal(0));
  const totalAmount    = lines.reduce((s, l) => s.add(l.lineTotal),     new Decimal(0));
  return { subtotal, discountAmount, taxAmount, totalAmount };
}

