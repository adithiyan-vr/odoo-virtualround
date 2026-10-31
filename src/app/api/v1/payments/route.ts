import { route } from '@/server/route-wrapper';
import { PaymentService } from '@/server/payments/payment.service';
import { parsePagination } from '@/lib/pagination';
import { ok, created } from '@/lib/api-envelope';
import { recordPaymentSchema, paymentQuerySchema } from '@/lib/validators/payment.validator';
import { Role, PaymentMethod } from '@/lib/constants/enums';

export const POST = route(
  {
    roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER],
    body: recordPaymentSchema,
  },
  async ({ body, session }) => {
    const result = await PaymentService.recordPayment(
      {
        invoiceId: body.invoiceId,
        amount: body.amount,
        method: body.method as PaymentMethod,
        paymentDate: new Date(body.paymentDate),
        reference: body.reference,
        note: body.note,
      },
      session
    );
    return created(result);
  }
);

export const GET = route(
  {
    roles: [Role.ADMIN, Role.STAFF, Role.CUSTOMER],
    query: paymentQuerySchema,
  },
  async ({ req, session, query }) => {
    const pagination = parsePagination(req);
    const result = await PaymentService.listPayments(
      {
        ...pagination,
        invoiceId: query.invoiceId,
        customerId: query.customerId,
        method: query.method as PaymentMethod | undefined,
        from: query.from,
        to: query.to,
        q: query.q,
      },
      session
    );
    return ok(result);
  }
);
