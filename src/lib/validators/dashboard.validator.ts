import { z } from 'zod';
import { SubscriptionStatus, InvoiceStatus } from '@/lib/constants/enums';

export const dashboardQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  planId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  invoiceStatus: z.nativeEnum(InvoiceStatus).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type DashboardQueryParams = z.infer<typeof dashboardQuerySchema>;
