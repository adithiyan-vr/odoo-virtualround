import { z } from 'zod';
import { PaymentMethod } from '@/lib/constants/enums';

const paymentMethodSchema = z
  .union([
    z.nativeEnum(PaymentMethod),
    z.literal('BANK').transform(() => PaymentMethod.BANK_TRANSFER),
  ])
  .pipe(z.nativeEnum(PaymentMethod));

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid({ message: 'Valid invoiceId is required' }),
  amount: z.coerce.number().positive({ message: 'Payment amount must be greater than zero' }),
  method: paymentMethodSchema,
  paymentDate: z.string().or(z.date()).transform((val) => new Date(val)),
  reference: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const paymentQuerySchema = z.object({
  invoiceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type PaymentQueryParams = z.infer<typeof paymentQuerySchema>;
