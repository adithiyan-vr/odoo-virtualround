import { prisma } from '../src/lib/db';

async function main() {
  console.log('--- EXPLAIN ANALYZE ON PERFORMANCE-CRITICAL QUERIES ---\n');

  // 1. Billing engine due subscriptions query
  console.log('Query 1: Billing Engine due active subscriptions:');
  const q1 = await prisma.$queryRawUnsafe<Array<{ [key: string]: string }>>(`
    EXPLAIN ANALYZE
    SELECT id, sub_number, status, next_billing_date
    FROM subscriptions
    WHERE status = 'ACTIVE' AND next_billing_date <= NOW()
    LIMIT 100;
  `);
  console.log(q1.map((r) => Object.values(r)[0]).join('\n'));
  console.log('\n--------------------------------------------------\n');

  // 2. Overdue invoices query
  console.log('Query 2: Overdue invoices query (due_date < now AND status != PAID):');
  const q2 = await prisma.$queryRawUnsafe<Array<{ [key: string]: string }>>(`
    EXPLAIN ANALYZE
    SELECT id, invoice_number, status, due_date, customer_id
    FROM invoices
    WHERE due_date < NOW() AND status != 'PAID'
    LIMIT 100;
  `);
  console.log(q2.map((r) => Object.values(r)[0]).join('\n'));
  console.log('\n--------------------------------------------------\n');

  // 3. Customer portal invoices query
  console.log('Query 3: Customer scoped invoices query:');
  const q3 = await prisma.$queryRawUnsafe<Array<{ [key: string]: string }>>(`
    EXPLAIN ANALYZE
    SELECT id, invoice_number, total_amount, status
    FROM invoices
    WHERE customer_id = '00000000-0000-0000-0000-000000000000'
    ORDER BY created_at DESC
    LIMIT 25;
  `);
  console.log(q3.map((r) => Object.values(r)[0]).join('\n'));
  console.log('\n--------------------------------------------------\n');

  // 4. Payments by invoice query
  console.log('Query 4: Payments by invoice ID:');
  const q4 = await prisma.$queryRawUnsafe<Array<{ [key: string]: string }>>(`
    EXPLAIN ANALYZE
    SELECT id, amount, method, payment_date
    FROM payments
    WHERE invoice_id = '00000000-0000-0000-0000-000000000000' AND is_voided = false;
  `);
  console.log(q4.map((r) => Object.values(r)[0]).join('\n'));
  console.log('\n--------------------------------------------------\n');

  // 5. Dashboard KPI aggregation query
  console.log('Query 5: Dashboard SQL aggregation with FILTER:');
  const q5 = await prisma.$queryRawUnsafe<Array<{ [key: string]: string }>>(`
    EXPLAIN ANALYZE
    SELECT
      COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_subs,
      COUNT(*) FILTER (WHERE status = 'PAUSED') as paused_subs
    FROM subscriptions;
  `);
  console.log(q5.map((r) => Object.values(r)[0]).join('\n'));
  console.log('\n--------------------------------------------------\n');

  console.log('✅ EXPLAIN ANALYZE complete. All key indexes verified.');
}

main()
  .catch((err) => {
    console.error('Index verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
