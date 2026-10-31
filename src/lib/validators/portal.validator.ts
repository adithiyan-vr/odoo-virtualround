import { z } from 'zod';
import { InvoiceStatus, PaymentMethod } from '@/lib/constants/enums';

const paymentMethodSchema = z
  .union([
    z.nativeEnum(PaymentMethod),
    z.literal('BANK').transform(() => PaymentMethod.BANK_TRANSFER),
  ])
  .pipe(z.nativeEnum(PaymentMethod));

export const portalRequestActionSchema = z.object({
  action: z.enum(['PAUSE', 'RESUME', 'CLOSE'], {
    message: 'Action must be one of PAUSE, RESUME, or CLOSE',
  }),
  reason: z.string().trim().max(500).optional(),
});

export type PortalRequestActionInput = z.infer<typeof portalRequestActionSchema>;

export const portalPayInvoiceSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be greater than zero' }),
  method: paymentMethodSchema.default(PaymentMethod.UPI),
  reference: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

export type PortalPayInvoiceInput = z.infer<typeof portalPayInvoiceSchema>;

export const portalProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must have at least 2 characters' }).optional(),
  company: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  addressLine1: z.string().trim().max(200).optional().nullable(),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().length(2).optional(),
  gstin: z.string().trim().max(15).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type PortalProfileUpdateInput = z.infer<typeof portalProfileUpdateSchema>;

export const portalInvoicesQuerySchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
