import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:3000/api/v1';

let adminToken = '';
let staffToken = '';
let customerToken = '';
let createdProductId = '';
let createdVariantId = '';
let createdPlanId = '';
let createdTemplateId = '';
let createdTaxId = '';
let createdTermId = '';

let isServerUp = false;
try {
  const res = await fetch('http://localhost:3000/api/v1/health', { signal: AbortSignal.timeout(1000) });
  if (res.ok) isServerUp = true;
} catch {
  isServerUp = false;
}

describe.skipIf(!isServerUp)('End-to-End Backend Functionality Audit', { timeout: 30000 }, () => {
  beforeAll(async () => {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    expect(healthRes.status).toBe(200);
    expect(healthData.status).toBe('ok');
    expect(healthData.db).toBe('up');

    // 2. Admin Login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@brightloop.io',
        password: 'Admin@12345',
      }),
    });
    expect(adminRes.status).toBe(200);
    const cookies = adminRes.headers.get('set-cookie') || '';
    const match = cookies.match(/bl_session=([^;]+)/);
    adminToken = match ? match[1] : '';
    expect(adminToken).toBeTruthy();

    // 3. Staff Login
    const staffRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@brightloop.io',
        password: 'Staff@12345',
      }),
    });
    expect(staffRes.status).toBe(200);
    const staffCookies = staffRes.headers.get('set-cookie') || '';
    const staffMatch = staffCookies.match(/bl_session=([^;]+)/);
    staffToken = staffMatch ? staffMatch[1] : '';
    expect(staffToken).toBeTruthy();

    // 4. Customer Login
    const custRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@brightloop.io',
        password: 'Customer@12345',
      }),
    });
    expect(custRes.status).toBe(200);
    const custCookies = custRes.headers.get('set-cookie') || '';
    const custMatch = custCookies.match(/bl_session=([^;]+)/);
    customerToken = custMatch ? custMatch[1] : '';
    expect(customerToken).toBeTruthy();
  });

  // ────────────────── MODULE 1: AUTH & RBAC ──────────────────

  describe('Module 1: Authentication & RBAC', () => {
    it('GET /auth/me returns current user profile with role', async () => {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.email).toBe('admin@brightloop.io');
      expect(json.data.role).toBe('ADMIN');
    });

    it('GET /auth/me rejects unauthenticated request (401)', async () => {
      const res = await fetch(`${BASE_URL}/auth/me`);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('POST /auth/signup validates password regex and creates customer profile', async () => {
      const uniqueEmail = `testuser_${Date.now()}@test.io`;
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Customer',
          email: uniqueEmail,
          password: 'ValidPassword#2026',
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.email).toBe(uniqueEmail);
      expect(json.data.role).toBe('CUSTOMER');
    });

    it('POST /auth/signup rejects duplicate email with 409 CONFLICT', async () => {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Admin',
          email: 'admin@brightloop.io',
          password: 'ValidPassword#2026',
        }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('CONFLICT');
    });

    it('POST /auth/signup rejects invalid password (too short or missing character)', async () => {
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Weak Password User',
          email: 'weakpass@test.io',
          password: 'weak',
        }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /auth/forgot-password creates email log and reset token', async () => {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@brightloop.io' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.message).toContain('reset link has been sent');

      // Verify email was logged to dev mailbox
      const mailboxRes = await fetch(`${BASE_URL}/dev/mailbox`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(mailboxRes.status).toBe(200);
      const mailboxData = await mailboxRes.json();
      expect(mailboxData.data.length).toBeGreaterThan(0);
      const lastEmail = mailboxData.data[0];
      expect(lastEmail.toEmail).toBe('admin@brightloop.io');
      expect(lastEmail.template).toBe('reset_password');
    });

    it('POST /users/staff allows ADMIN to create staff', async () => {
      const uniqueStaffEmail = `staff_${Date.now()}@brightloop.io`;
      const res = await fetch(`${BASE_URL}/users/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'New Operations Staff',
          email: uniqueStaffEmail,
          password: 'StaffPassword#2026',
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.role).toBe('STAFF');
      expect(json.data.email).toBe(uniqueStaffEmail);
    });

    it('POST /users/staff blocks non-ADMIN (CUSTOMER / STAFF) with 403 FORBIDDEN', async () => {
      const res = await fetch(`${BASE_URL}/users/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          name: 'Hacker Staff',
          email: 'hacker@brightloop.io',
          password: 'HackerPassword#2026',
        }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('GET /users allows ADMIN to list users with pagination', async () => {
      const res = await fetch(`${BASE_URL}/users?page=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toBeDefined();
      expect(json.meta.page).toBe(1);
    });

    it('GET /customers allows STAFF and ADMIN to list customers', async () => {
      const res = await fetch(`${BASE_URL}/customers?page=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });
  });

  // ────────────────── MODULE 2: CATALOG & MASTER DATA ──────────────────

  describe('Module 2: Catalog & Master Data', () => {
    it('GET /products lists catalog with variants and taxes', async () => {
      const res = await fetch(`${BASE_URL}/products?page=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      // Check BL-CRM product and variant pricing
      const crm = json.data.find((p: any) => p.sku === 'BL-CRM');
      expect(crm).toBeDefined();
      expect(crm.salesPrice).toBe(1200);

      const odooVariant = crm.variants.find((v: any) => v.attributeValue === 'Odoo');
      expect(odooVariant).toBeDefined();
      expect(odooVariant.priceSurcharge).toBe(560);
      expect(odooVariant.effectivePrice).toBe(1760); // 1200 + 560
    });

    it('POST /products allows ADMIN to create a product', async () => {
      const uniqueSku = `TEST-${Date.now().toString().slice(-4)}`;
      const res = await fetch(`${BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Cloud Storage Add-on',
          sku: uniqueSku,
          type: 'SERVICE',
          salesPrice: 500,
          costPrice: 150,
          notes: '100GB extra storage',
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBeDefined();
      expect(json.data.sku).toBe(uniqueSku);
      createdProductId = json.data.id;
    });

    it('GET /products/:id retrieves product detail', async () => {
      const res = await fetch(`${BASE_URL}/products/${createdProductId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(createdProductId);
      expect(json.data.name).toBe('Cloud Storage Add-on');
    });

    it('POST /products/:id/variants creates a variant with surcharge', async () => {
      const res = await fetch(`${BASE_URL}/products/${createdProductId}/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          attributeName: 'Tier',
          attributeValue: 'Premium SSD',
          priceSurcharge: 250,
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.attributeName).toBe('Tier');
      expect(json.data.attributeValue).toBe('Premium SSD');
      expect(json.data.priceSurcharge).toBe(250);
      expect(json.data.effectivePrice).toBe(750); // 500 + 250
      createdVariantId = json.data.id;
    });

    it('GET /plans lists all active subscription plans', async () => {
      const res = await fetch(`${BASE_URL}/plans`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);

      // Verify lifecycle flags on plans
      const starter = json.data.find((p: any) => p.name === 'Starter Monthly');
      expect(starter).toBeDefined();
      expect(starter.billingInterval).toBe('MONTHLY');
      expect(starter.canPause).toBe(true);
      expect(starter.canCloseEarly).toBe(true);
      expect(starter.canRenew).toBe(true);
    });

    it('POST /plans allows ADMIN to create a plan with lifecycle flags', async () => {
      const res = await fetch(`${BASE_URL}/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Developer Pro Quarterly',
          description: 'Quarterly billing for dev teams',
          price: 2999,
          billingInterval: 'MONTHLY',
          minQuantity: 2,
          validFrom: '2026-01-01',
          autoClose: false,
          canCloseEarly: true,
          canPause: true,
          canRenew: true,
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Developer Pro Quarterly');
      createdPlanId = json.data.id;
    });

    it('GET /templates lists quotation templates with lines', async () => {
      const res = await fetch(`${BASE_URL}/templates`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].lines).toBeDefined();
      expect(json.data[0].plan).toBeDefined();
    });

    it('POST /templates allows ADMIN to create a quotation template', async () => {
      const res = await fetch(`${BASE_URL}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Custom Starter Pack',
          planId: createdPlanId,
          validityDays: 14,
          lines: [{ productId: createdProductId, quantity: 2, sortOrder: 0 }],
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Custom Starter Pack');
      expect(json.data.lines.length).toBe(1);
      createdTemplateId = json.data.id;
    });

    it('GET /taxes lists admin tax rules (GST 18% default)', async () => {
      const res = await fetch(`${BASE_URL}/taxes`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      const gst18 = json.data.find((t: any) => t.name === 'GST 18%');
      expect(gst18).toBeDefined();
      expect(gst18.isDefault).toBe(true);
      expect(gst18.ratePercent).toBe(18);
    });

    it('POST /taxes allows ADMIN to create a tax rule', async () => {
      const res = await fetch(`${BASE_URL}/taxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Special Tech Cess 1%',
          ratePercent: 1.0,
          isDefault: false,
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.ratePercent).toBe(1);
      createdTaxId = json.data.id;
    });

    it('GET /payment-terms lists payment terms (Net 30 default)', async () => {
      const res = await fetch(`${BASE_URL}/payment-terms`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
      const net30 = json.data.find((pt: any) => pt.name === 'Net 30');
      expect(net30).toBeDefined();
      expect(net30.isDefault).toBe(true);
      expect(net30.days).toBe(30);
    });

    it('POST /payment-terms allows ADMIN to create a payment term', async () => {
      const res = await fetch(`${BASE_URL}/payment-terms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Net 45 Custom',
          days: 45,
          isDefault: false,
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.days).toBe(45);
      createdTermId = json.data.id;
    });

    it('DELETE /products/:id archives a product safely', async () => {
      const res = await fetch(`${BASE_URL}/products/${createdProductId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.isActive).toBe(false);
    });
  });
});
