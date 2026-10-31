// Re-export Prisma enums and create const mappings for client and server usage

export const Role = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ProductType = {
  SERVICE: 'SERVICE',
  STORABLE: 'STORABLE',
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const BillingInterval = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;
export type BillingInterval = (typeof BillingInterval)[keyof typeof BillingInterval];

export const SubscriptionStatus = {
  DRAFT: 'DRAFT',
  QUOTATION: 'QUOTATION',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const CloseReason = {
  MANUAL: 'MANUAL',
  CUSTOMER_REQUEST: 'CUSTOMER_REQUEST',
  EXPIRED: 'EXPIRED',
  PLAN_ENDED: 'PLAN_ENDED',
  CANCELLED: 'CANCELLED',
} as const;
export type CloseReason = (typeof CloseReason)[keyof typeof CloseReason];

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const DiscountType = {
  FIXED: 'FIXED',
  PERCENT: 'PERCENT',
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const DiscountScope = {
  PRODUCT: 'PRODUCT',
  SUBSCRIPTION: 'SUBSCRIPTION',
} as const;
export type DiscountScope = (typeof DiscountScope)[keyof typeof DiscountScope];

export const PaymentMethod = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD: 'CARD',
  CASH: 'CASH',
  UPI: 'UPI',
  CHEQUE: 'CHEQUE',
  OTHER: 'OTHER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const BillingRunStatus = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
} as const;
export type BillingRunStatus = (typeof BillingRunStatus)[keyof typeof BillingRunStatus];

export const EmailStatus = {
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type EmailStatus = (typeof EmailStatus)[keyof typeof EmailStatus];
