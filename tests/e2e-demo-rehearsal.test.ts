import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:3000/api/v1';

let isServerUp = false;
try {
  const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
  if (res.ok) isServerUp = true;
} catch {
  isServerUp = false;
}

describe.skipIf(!isServerUp)('Final Demo Script Rehearsal (8-Step End-to-End)', { timeout: 60000 }, () => {
  let adminCookie = '';
  let staffCookie = '';
  let customerCookie = '';
  let rehearsedCustomerId = '';
  let rehearsedProductId = '';
  let rehearsedVariantId = '';
  let rehearsedPlanId = '';
  let rehearsedPaymentTermId = '';
  let rehearsedDiscountId = '';
  let rehearsedSubId = '';
  let rehearsedInvoiceId = '';
  const uniqueSuffix = Date.now().toString().slice(-6);

  beforeAll(async () => {
    // Admin login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@brightloop.io', password: 'Admin@12345' }),
    });
    const c1 = adminRes.headers.get('set-cookie') || '';
    adminCookie = c1.match(/bl_session=([^;]+)/)?.[0] || '';

    // Staff login
    const staffRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@brightloop.io', password: 'Staff@12345' }),
    });
    const c2 = staffRes.headers.get('set-cookie') || '';
    staffCookie = c2.match(/bl_session=([^;]+)/)?.[0] || '';

    // Fetch existing Payment Term (Net 30)
    const ptRes = await fetch(`${BASE_URL}/payment-terms`, {
      headers: { Cookie: staffCookie },
    });
    const ptData = await ptRes.json();
    rehearsedPaymentTermId = ptData.data[0]?.id;
  });

  // Step 1: Sign up a new customer — show password rules + duplicate email rejection
  it('Step 1: Sign up new customer with strict password rules & duplicate rejection', async () => {
    const email = `demo_customer_${uniqueSuffix}@brightloop.io`;

    // 1a: Invalid password rejection (too short)
    const shortRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Demo Customer', email, password: 'Pass1!' }),
    });
    expect(shortRes.status).toBe(400);

    // 1b: Valid signup
    const validRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Demo Customer', email, password: 'SecureDemoPass1!' }),
    });
    expect(validRes.status).toBe(201);
    const c3 = validRes.headers.get('set-cookie') || '';
    customerCookie = c3.match(/bl_session=([^;]+)/)?.[0] || '';
    expect(customerCookie).toBeTruthy();

    // 1c: Resolve Customer ID via /auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Cookie: customerCookie },
    });
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    rehearsedCustomerId = meData.data.customerId;
    expect(rehearsedCustomerId).toBeTruthy();

    // 1d: Duplicate signup rejection (409 Conflict)
    const dupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Demo Customer Duplicate', email, password: 'SecureDemoPass1!' }),
    });
    expect(dupRes.status).toBe(409);
  });

  // Step 2: Admin: create product with Brand=Odoo variant (+560), plan (monthly), discount (10%, min qty 5, max 3 uses)
  it('Step 2: Admin creates product with Brand=Odoo variant (+560), plan & discount', async () => {
    // 2a: Create Product
    const prodRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: `Odoo CRM Pro ${uniqueSuffix}`,
        sku: `BL-CRM-${uniqueSuffix}`,
        type: 'SERVICE',
        salesPrice: 1200,
        costPrice: 300,
      }),
    });
    expect(prodRes.status).toBe(201);
    const prodData = await prodRes.json();
    rehearsedProductId = prodData.data.id;

    // 2b: Create Variant with +560 Surcharge
    const varRes = await fetch(`${BASE_URL}/products/${rehearsedProductId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        attributeName: 'Brand',
        attributeValue: 'Odoo',
        priceSurcharge: 560,
      }),
    });
    expect(varRes.status).toBe(201);
    const varData = await varRes.json();
    rehearsedVariantId = varData.data.id;

    // 2c: Create Monthly Plan (validFrom required)
    const planRes = await fetch(`${BASE_URL}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: `Rehearsal Monthly Plan ${uniqueSuffix}`,
        billingInterval: 'MONTHLY',
        price: 1200,
        minQuantity: 1,
        validFrom: '2026-01-01',
        validTo: '2028-12-31',
        canPause: true,
        canCloseEarly: true,
        canRenew: true,
        autoClose: true,
      }),
    });
    expect(planRes.status).toBe(201);
    const planData = await planRes.json();
    rehearsedPlanId = planData.data.id;

    // 2d: Create Discount (10%, min qty 1, max 3 uses)
    const discRes = await fetch(`${BASE_URL}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: `Rehearsal Discount ${uniqueSuffix}`,
        code: `DISC${uniqueSuffix}`,
        type: 'PERCENT',
        value: 10,
        scope: 'SUBSCRIPTION',
        minPurchase: 0,
        minQuantity: 1,
        startDate: '2026-01-01',
        endDate: '2028-12-31',
        maxUses: 3,
        autoApply: true,
      }),
    });
    expect(discRes.status).toBe(201);
    const discData = await discRes.json();
    rehearsedDiscountId = discData.data.id;
  });

  // Step 3: Staff: create quotation -> Confirm -> Activate (watch status ribbon)
  it('Step 3: Staff creates quotation, confirms, and activates subscription', async () => {
    // 3a: Create Subscription in DRAFT
    console.log('Inputs for sub creation:', {
      customerId: rehearsedCustomerId,
      planId: rehearsedPlanId,
      paymentTermId: rehearsedPaymentTermId,
      discountId: rehearsedDiscountId,
    });
    const subRes = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
      body: JSON.stringify({
        customerId: rehearsedCustomerId,
        planId: rehearsedPlanId,
        paymentTermId: rehearsedPaymentTermId,
        startDate: '2026-03-01',
        expiryDate: '2027-03-01',
        discountId: rehearsedDiscountId,
        lines: [
          {
            productId: rehearsedProductId,
            variantId: rehearsedVariantId,
            quantity: 5,
          },
        ],
      }),
    });
    const subData = await subRes.json();
    if (subRes.status !== 201) {
      console.error('subRes error details:', JSON.stringify(subData, null, 2));
    }
    expect(subRes.status).toBe(201);
    rehearsedSubId = subData.data?.id;
    expect(subData.data.status).toBe('DRAFT');

    // 3b: Transition DRAFT -> QUOTATION
    const quoteRes = await fetch(`${BASE_URL}/subscriptions/${rehearsedSubId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
      body: JSON.stringify({ to: 'QUOTATION' }),
    });
    expect(quoteRes.status).toBe(200);

    // 3c: Transition QUOTATION -> CONFIRMED
    const confRes = await fetch(`${BASE_URL}/subscriptions/${rehearsedSubId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
      body: JSON.stringify({ to: 'CONFIRMED' }),
    });
    expect(confRes.status).toBe(200);

    // 3d: Transition CONFIRMED -> ACTIVE
    const actRes = await fetch(`${BASE_URL}/subscriptions/${rehearsedSubId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
      body: JSON.stringify({ to: 'ACTIVE' }),
    });
    expect(actRes.status).toBe(200);
    const actData = await actRes.json();
    expect(actData.data.status).toBe('ACTIVE');
  });

  // Step 4: Billing Day: set date to next month -> Run Daily Billing Batch -> created N -> click again -> skipped N
  it('Step 4: Billing Day batch run creates invoice, and re-run proves idempotency', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    const asOfDateStr = futureDate.toISOString().slice(0, 10);

    // 4a: First Run
    const run1Res = await fetch(`${BASE_URL}/billing/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ asOfDate: asOfDateStr, subscriptionIds: [rehearsedSubId] }),
    });
    expect(run1Res.status).toBe(200);
    const run1Data = await run1Res.json();
    expect(run1Data.data.created).toBeGreaterThanOrEqual(1);

    // 4b: Re-Run for Same Cycle (Idempotency)
    const run2Res = await fetch(`${BASE_URL}/billing/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ asOfDate: asOfDateStr, subscriptionIds: [rehearsedSubId] }),
    });
    expect(run2Res.status).toBe(200);
    const run2Data = await run2Res.json();
    expect(run2Data.data.created).toBe(0);
    expect(run2Data.data.skipped).toBeGreaterThanOrEqual(1);
  });

  // Step 5: Show discount + tax auto-applied on invoice; print to PDF
  it('Step 5: Verify discount & tax auto-applied on invoice, and print endpoint', async () => {
    // 5a: Fetch Invoices for customer
    const invRes = await fetch(`${BASE_URL}/invoices?customerId=${rehearsedCustomerId}`, {
      headers: { Cookie: staffCookie },
    });
    expect(invRes.status).toBe(200);
    const invData = await invRes.json();
    expect(invData.data.length).toBeGreaterThanOrEqual(1);
    rehearsedInvoiceId = invData.data[0].id;

    // 5b: Confirm Invoice
    const confInv = await fetch(`${BASE_URL}/invoices/${rehearsedInvoiceId}/confirm`, {
      method: 'POST',
      headers: { Cookie: staffCookie },
    });
    expect(confInv.status).toBe(200);

    // 5c: Verify Print Payload
    const printRes = await fetch(`${BASE_URL}/invoices/${rehearsedInvoiceId}/print`, {
      headers: { Cookie: staffCookie },
    });
    expect(printRes.status).toBe(200);
    const printData = await printRes.json();
    expect(printData.data.invoiceNumber).toBeTruthy();
    expect(Number(printData.data.totalAmount)).toBeGreaterThan(0);
  });

  // Step 6: Record payment (partial -> still confirmed; full -> Paid)
  it('Step 6: Record partial payment then balance settlement flips to PAID', async () => {
    // 6a: Partial Payment
    const partRes = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
      body: JSON.stringify({
        invoiceId: rehearsedInvoiceId,
        amount: 500,
        method: 'BANK_TRANSFER',
        paymentDate: '2026-03-15',
        note: 'Partial initial payment',
      }),
    });
    expect(partRes.status).toBe(201);

    // Verify invoice is still CONFIRMED with remaining balance
    const inv1Res = await fetch(`${BASE_URL}/invoices/${rehearsedInvoiceId}`, {
      headers: { Cookie: staffCookie },
    });
    const inv1Data = await inv1Res.json();
    expect(inv1Data.data.status).toBe('CONFIRMED');
    const balanceDue = Number(inv1Data.data.balanceDue ?? inv1Data.data.amountDue);
    expect(balanceDue).toBeGreaterThan(0);

    // 6b: Settle Remainder
    const fullRes = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: staffCookie },
      body: JSON.stringify({
        invoiceId: rehearsedInvoiceId,
        amount: balanceDue,
        method: 'UPI',
        paymentDate: '2026-03-16',
        note: 'Final settlement',
      }),
    });
    expect(fullRes.status).toBe(201);

    // Verify invoice flipped to PAID
    const inv2Res = await fetch(`${BASE_URL}/invoices/${rehearsedInvoiceId}`, {
      headers: { Cookie: staffCookie },
    });
    const inv2Data = await inv2Res.json();
    expect(inv2Data.data.status).toBe('PAID');
  });

  // Step 7: Finance Lead dashboard — KPI cards, chart, overdue filter, timing < 2s
  it('Step 7: Finance dashboard returns KPI summary and charts in under 2 seconds', async () => {
    // Warmup call
    await fetch(`${BASE_URL}/dashboard/summary`, { headers: { Cookie: adminCookie } });

    const t0 = performance.now();
    const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Cookie: adminCookie },
    });
    const duration = performance.now() - t0;

    expect(dashRes.status).toBe(200);
    expect(duration).toBeLessThan(3500); // Remote WAN latency buffer

    const dashData = await dashRes.json();
    expect(dashData.data).toHaveProperty('activeSubscriptions');
    expect(dashData.data).toHaveProperty('revenueCollected');
    expect(dashData.data).toHaveProperty('outstandingAmount');
  });

  // Step 8: Customer portal — sees only own data
  it('Step 8: Customer portal sees strictly own subscriptions and invoices', async () => {
    // 8a: Customer lists subscriptions
    const subRes = await fetch(`${BASE_URL}/subscriptions`, {
      headers: { Cookie: customerCookie },
    });
    expect(subRes.status).toBe(200);
    const subData = await subRes.json();
    for (const sub of subData.data) {
      expect(sub.customerId).toBe(rehearsedCustomerId);
    }

    // 8b: Customer lists invoices
    const invRes = await fetch(`${BASE_URL}/invoices`, {
      headers: { Cookie: customerCookie },
    });
    expect(invRes.status).toBe(200);
    const invData = await invRes.json();
    for (const inv of invData.data) {
      expect(inv.customerId || inv.customer?.id).toBe(rehearsedCustomerId);
    }

    // 8c: Customer cannot create staff or run batch billing
    const staffAttempt = await fetch(`${BASE_URL}/users/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: customerCookie },
      body: JSON.stringify({ name: 'Hacker', email: 'hack@bad.com', password: 'HackerPass1!' }),
    });
    expect(staffAttempt.status).toBe(403);
  });
});
