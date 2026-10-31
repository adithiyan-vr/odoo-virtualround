import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:3000/api/v1';

let adminToken = '';
let staffToken = '';
let customerToken = '';

let testCustomerId = '';
let testProductId = '';
let testVariantId = '';
let starterPlanId = '';
let noPausePlanId = '';
let testPaymentTermId = '';
let testDiscountId = '';
let createdSubId = '';
let createdInvoiceId = '';

describe('Member M2 End-to-End Functionality Audit', { timeout: 60000 }, () => {
  beforeAll(async () => {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    expect(healthRes.status).toBe(200);

    // 2. Admin Login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@brightloop.io', password: 'Admin@12345' }),
    });
    expect(adminRes.status).toBe(200);
    const adminCookies = adminRes.headers.get('set-cookie') || '';
    adminToken = (adminCookies.match(/bl_session=([^;]+)/) || [])[1] || '';
    expect(adminToken).toBeTruthy();

    // 3. Staff Login
    const staffRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@brightloop.io', password: 'Staff@12345' }),
    });
    expect(staffRes.status).toBe(200);
    const staffCookies = staffRes.headers.get('set-cookie') || '';
    staffToken = (staffCookies.match(/bl_session=([^;]+)/) || [])[1] || '';
    expect(staffToken).toBeTruthy();

    // 4. Customer Login
    const custRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@brightloop.io', password: 'Customer@12345' }),
    });
    expect(custRes.status).toBe(200);
    const custCookies = custRes.headers.get('set-cookie') || '';
    customerToken = (custCookies.match(/bl_session=([^;]+)/) || [])[1] || '';
    expect(customerToken).toBeTruthy();

    // 5. Gather Master Data IDs
    const custsRes = await fetch(`${BASE_URL}/customers?page=1&pageSize=5`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const custsData = await custsRes.json();
    testCustomerId = custsData.data[0].id;

    const prodsRes = await fetch(`${BASE_URL}/products?page=1&pageSize=50`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const prodsData = await prodsRes.json();
    const crmProd = prodsData.data.find((p: any) => p.sku === 'BL-CRM') || prodsData.data[0];
    testProductId = crmProd.id;
    const odooVar = crmProd.variants.find((v: any) => v.attributeValue === 'Odoo') || crmProd.variants[0];
    testVariantId = odooVar ? odooVar.id : '';

    const plansRes = await fetch(`${BASE_URL}/plans`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const plansData = await plansRes.json();
    const starterPlan = plansData.data.find((p: any) => p.name === 'Starter Monthly');
    starterPlanId = starterPlan.id;

    const noPausePlan = plansData.data.find((p: any) => p.name === 'Business Yearly');
    noPausePlanId = noPausePlan.id;

    const termsRes = await fetch(`${BASE_URL}/payment-terms`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const termsData = await termsRes.json();
    testPaymentTermId = termsData.data[0].id;
  });

  // ────────────────── MODULE 5: DISCOUNTS & PRICING ENGINE ──────────────────

  describe('Module 5: Discounts Management', () => {
    it('POST /discounts creates a new percentage discount', async () => {
      const res = await fetch(`${BASE_URL}/discounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: `Audit Discount ${Date.now()}`,
          code: `AUDIT${Date.now().toString().slice(-4)}`,
          type: 'PERCENT',
          value: 15,
          scope: 'SUBSCRIPTION',
          minPurchase: 1000,
          startDate: '2026-01-01',
          endDate: '2027-12-31',
          maxUses: 10,
          autoApply: false,
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.value).toBe(15);
      expect(json.data.type).toBe('PERCENT');
      testDiscountId = json.data.id;
    });

    it('GET /discounts lists discounts with pagination and active state', async () => {
      const res = await fetch(`${BASE_URL}/discounts?page=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.meta.page).toBe(1);
    });

    it('GET /discounts/:id retrieves discount detail', async () => {
      const res = await fetch(`${BASE_URL}/discounts/${testDiscountId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(testDiscountId);
      expect(json.data.computedIsActive).toBe(true);
    });

    it('PATCH /discounts/:id updates discount fields', async () => {
      const res = await fetch(`${BASE_URL}/discounts/${testDiscountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          value: 20,
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.value).toBe(20);
    });
  });

  // ────────────────── MODULE 3: SUBSCRIPTION LIFECYCLE & STATE MACHINE ──────────────────

  describe('Module 3: Subscription Creation & State Machine', () => {
    it('POST /subscriptions creates subscription in DRAFT with lines & variant surcharge', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          customerId: testCustomerId,
          planId: starterPlanId,
          paymentTermId: testPaymentTermId,
          startDate: '2026-03-01',
          expiryDate: '2027-03-01',
          notes: 'E2E Test Subscription',
          lines: [
            {
              productId: testProductId,
              variantId: testVariantId,
              quantity: 2,
            },
          ],
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.subNumber).toMatch(/^SUB-\d+$/);
      expect(json.data.status).toBe('DRAFT');

      // Verify lines: plan fee line + product line
      // Base CRM salesPrice (1200) + Odoo variant surcharge (560) = 1760 unitPrice
      const crmLine = json.data.lines.find((l: any) => l.productId === testProductId);
      expect(crmLine).toBeDefined();
      expect(crmLine.unitPrice).toBe(1760);
      expect(crmLine.quantity).toBe(2);
      expect(crmLine.subtotal).toBe(3520); // 1760 * 2

      // Plan fee line (Starter Monthly = 499)
      const planLine = json.data.lines.find((l: any) => l.isPlanFee);
      expect(planLine).toBeDefined();
      expect(planLine.unitPrice).toBe(499);

      createdSubId = json.data.id;
    });

    it('GET /subscriptions lists subscriptions with role and filters', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions?page=1&pageSize=10&status=DRAFT`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.some((s: any) => s.id === createdSubId)).toBe(true);
    });

    it('GET /subscriptions/:id returns full subscription with allowedTransitions', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions/${createdSubId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(createdSubId);
      expect(json.data.status).toBe('DRAFT');
      expect(json.data.allowedTransitions).toContain('send_quotation');
    });

    it('PATCH /subscriptions/:id updates editable fields in DRAFT', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions/${createdSubId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          notes: 'Updated notes in DRAFT',
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.notes).toBe('Updated notes in DRAFT');
    });

    it('POST /subscriptions/:id/transition: DRAFT -> QUOTATION', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions/${createdSubId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ to: 'QUOTATION' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('QUOTATION');
      expect(json.data.quotationDate).toBeDefined();
      expect(json.data.validUntil).toBeDefined();
    });

    it('POST /subscriptions/:id/transition: Rejects illegal jump QUOTATION -> PAUSED with 409', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions/${createdSubId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ to: 'PAUSED' }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('CONFLICT');
    });

    it('POST /subscriptions/:id/transition: QUOTATION -> CONFIRMED', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions/${createdSubId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ to: 'CONFIRMED' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('CONFIRMED');
    });

    it('POST /subscriptions/:id/transition: CONFIRMED -> ACTIVE (sets anchor and nextBillingDate)', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions/${createdSubId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ to: 'ACTIVE' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('ACTIVE');
      expect(json.data.billingAnchorDate).toBeDefined();
      expect(json.data.nextBillingDate).toBeDefined();
    });

    it('POST /subscriptions/:id/transition: ACTIVE -> PAUSED (when plan.canPause=true)', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions/${createdSubId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ to: 'PAUSED' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('PAUSED');
      expect(json.data.pausedAt).toBeDefined();
      expect(json.data.nextBillingDate).toBeNull();
    });

    it('POST /subscriptions/:id/transition: PAUSED -> ACTIVE (resumes and recalculates anchor)', async () => {
      const res = await fetch(`${BASE_URL}/subscriptions/${createdSubId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ to: 'ACTIVE' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('ACTIVE');
      expect(json.data.pausedAt).toBeNull();
      expect(json.data.nextBillingDate).toBeDefined();
    });

    it('Policy enforcement: Plan with canPause=false blocks pause with 409 CONFLICT', async () => {
      // Create subscription with noPausePlan
      const subRes = await fetch(`${BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          customerId: testCustomerId,
          planId: noPausePlanId,
          paymentTermId: testPaymentTermId,
          startDate: '2026-03-01',
          expiryDate: '2027-03-01',
          lines: [{ productId: testProductId, quantity: 1 }],
        }),
      });
      const subData = await subRes.json();
      expect(subRes.status).toBe(201);
      const subId = subData.data.id;

      // Advance to CONFIRMED then ACTIVE
      await fetch(`${BASE_URL}/subscriptions/${subId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ to: 'CONFIRMED' }),
      });
      await fetch(`${BASE_URL}/subscriptions/${subId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ to: 'ACTIVE' }),
      });

      // Now attempt to pause - should be rejected by plan policy
      const pauseRes = await fetch(`${BASE_URL}/subscriptions/${subId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ to: 'PAUSED' }),
      });
      expect(pauseRes.status).toBe(409);
      const pauseJson = await pauseRes.json();
      expect(pauseJson.error.message).toMatch(/pause/i);
    });

    it('POST /subscriptions/:id/renew extends expiryDate by billing interval', async () => {
      const beforeRes = await fetch(`${BASE_URL}/subscriptions/${createdSubId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const beforeData = await beforeRes.json();
      const oldExpiry = new Date(beforeData.data.expiryDate).getTime();

      const renewRes = await fetch(`${BASE_URL}/subscriptions/${createdSubId}/renew`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(renewRes.status).toBe(200);
      const renewData = await renewRes.json();
      const newExpiry = new Date(renewData.data.expiryDate).getTime();
      expect(newExpiry).toBeGreaterThan(oldExpiry);
    });
  });

  // ────────────────── MODULE 4: BILLING DAY ENGINE & INVOICES ──────────────────

  describe('Module 4: Billing Day Engine & Invoicing', () => {
    it('POST /billing/run processes due active subscription and creates DRAFT invoice', async () => {
      const res = await fetch(`${BASE_URL}/billing/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          asOfDate: '2026-12-31',
          autoConfirm: false,
          subscriptionIds: [createdSubId],
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.billingRunId).toBeDefined();
      expect(json.data.due).toBe(1);
      expect(json.data.created).toBeGreaterThanOrEqual(1);
      expect(json.data.failed).toBe(0);
    });

    it('POST /billing/run IDEMPOTENCY: Re-running with same asOfDate skips existing cycle', async () => {
      const res = await fetch(`${BASE_URL}/billing/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          asOfDate: '2026-12-31',
          autoConfirm: false,
          subscriptionIds: [createdSubId],
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.created).toBe(0); // 0 new invoices created!
      expect(json.data.failed).toBe(0);
      expect(json.data.skipped).toBeGreaterThanOrEqual(1); // gracefully skipped
    });

    it('GET /invoices lists generated invoices', async () => {
      const res = await fetch(`${BASE_URL}/invoices?subscriptionId=${createdSubId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const inv = json.data[0];
      expect(inv.invoiceNumber).toMatch(/^INV-\d+$/);
      expect(inv.status).toBe('DRAFT');
      expect(inv.lines.length).toBeGreaterThan(0);
      expect(inv.totalAmount).toBeGreaterThan(0);
      createdInvoiceId = inv.id;
    });

    it('GET /invoices/:id retrieves invoice details with lines and allowedActions', async () => {
      const res = await fetch(`${BASE_URL}/invoices/${createdInvoiceId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(createdInvoiceId);
      expect(json.data.allowedActions).toContain('confirm');
      expect(json.data.allowedActions).toContain('cancel');
    });

    it('POST /invoices/:id/confirm transitions DRAFT to CONFIRMED', async () => {
      const res = await fetch(`${BASE_URL}/invoices/${createdInvoiceId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('CONFIRMED');
      expect(json.data.confirmedAt).toBeDefined();
      expect(json.data.allowedActions).toContain('send');
    });

    it('POST /invoices/:id/send marks invoice sent and triggers mock email', async () => {
      const res = await fetch(`${BASE_URL}/invoices/${createdInvoiceId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.sentAt).toBeDefined();
    });

    it('GET /invoices/:id/print retrieves printable invoice structure', async () => {
      const res = await fetch(`${BASE_URL}/invoices/${createdInvoiceId}/print`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.invoiceNumber).toBeDefined();
      expect(json.data.lines).toBeDefined();
    });

    it('POST /invoices/:id/cancel cancels an invoice with no payments', async () => {
      const res = await fetch(`${BASE_URL}/invoices/${createdInvoiceId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('CANCELLED');
      expect(json.data.cancelledAt).toBeDefined();
    });

    it('POST /billing/auto-close sweeps expired subscriptions cleanly', async () => {
      const res = await fetch(`${BASE_URL}/billing/auto-close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ asOfDate: '2026-12-31' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(typeof json.data.closed).toBe('number');
    });
  });
});
