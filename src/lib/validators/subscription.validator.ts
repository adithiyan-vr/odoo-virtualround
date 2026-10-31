/**
 * Zod validators owned by M2.
 */

import { z } from 'zod';
import { DiscountScope, DiscountType, SubscriptionStatus } from '@/lib/constants/enums';

// ─── Discount validators ─────────────────────────────────────────────────────

export const createDiscountSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(100).optional().nullable(),
  type: z.nativeEnum(DiscountType),
  value: z.number().positive(),
  scope: z.nativeEnum(DiscountScope),
  minPurchase: z.number().nonnegative().optional().nullable(),
  minQuantity: z.number().int().nonnegative().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  autoApply: z.boolean().optional().default(false),
  productIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;

export const updateDiscountSchema = createDiscountSchema.partial();
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;

// ─── Subscription validators ─────────────────────────────────────────────────

export const subscriptionLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  taxId: z.string().uuid().optional().nullable(),
});

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  templateId: z.string().uuid().optional().nullable(),
  planId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentTermId: z.string().uuid(),
  discountId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(subscriptionLineSchema).min(0),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  discountId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentTermId: z.string().uuid().optional(),
});
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export const transitionSchema = z.object({
  to: z.nativeEnum(SubscriptionStatus),
});
export type TransitionInput = z.infer<typeof transitionSchema>;

export const subscriptionQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  q: z.string().optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  planId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
});

// ─── Billing validators ──────────────────────────────────────────────────────

export const billingRunSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  autoConfirm: z.boolean().optional().default(false),
  subscriptionIds: z.array(z.string().uuid()).optional(),
});
export type BillingRunInput = z.infer<typeof billingRunSchema>;

// ─── Invoice validators ──────────────────────────────────────────────────────

export const invoiceQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  sort: z.string().optional(),
  status: z.string().optional(),
  overdue: z.string().optional(),
  customerId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

