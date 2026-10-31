import { route } from '@/server/route-wrapper';
import { ok } from '@/lib/api-envelope';
import { AppError } from '@/lib/errors';
import prisma from '@/lib/db';

export const GET = route({}, async ({ session }) => {
  const isDevMailboxEnabled = process.env.ENABLE_DEV_MAILBOX === 'true';

  if (!isDevMailboxEnabled) {
    if (!session || session.role !== 'ADMIN') {
      throw AppError.forbidden('Dev mailbox is disabled in production');
    }
  }

  const emails = await prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return ok(emails);
});
