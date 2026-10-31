/**
 * High-Volume Database Seeder — Module 7 & Demo (M4)
 * Seeds 5,000+ subscriptions, 10,000+ invoices, and payments in batched chunks.
 * Ensures the database satisfies the judge requirement:
 * "Every page responds in < 2s with 5,000+ subscriptions and 10,000+ invoices."
 */

import {
  PrismaClient,
  Role,
  ProductType,
  BillingInterval,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethod,
  DiscountType,
  DiscountScope,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from 'decimal.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const BATCH_CHUNK_SIZE = 500;
const TARGET_SUBSCRIPTIONS = 5200;
const TARGET_INVOICES_PER_SUB = 2; // ~10,400 invoices total

async function main() {
  console.log('⚡ Starting Brightloop High-Volume Seeder (5,000+ Subs / 10,000+ Invoices)...');
  const startTotal = performance.now();

  // 1. Ensure master data & demo users exist
  console.log('👤 Checking demo users...');
  const passwordHash = await bcrypt.hash('Admin@12345', 12);
  const staffHash = await bcrypt.hash('Staff@12345', 12);
  const custHash = await bcrypt.hash('Customer@12345', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.io' },
    update: { isActive: true },
    create: {
      name: 'Brightloop Admin',
      email: 'admin@brightloop.io',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@brightloop.io' },
    update: { isActive: true },
    create: {
      name: 'Brightloop Staff',
      email: 'staff@brightloop.io',
      passwordHash: staffHash,
      role: Role.STAFF,
    },
  });

  const demoCustomerUser = await prisma.user.upsert({
    where: { email: 'customer@brightloop.io' },
    update: { isActive: true },
    create: {
      name: 'Acme Traders (Demo)',
      email: 'customer@brightloop.io',
      passwordHash: custHash,
      role: Role.CUSTOMER,
    },
  });

  const demoCustomer = await prisma.customer.upsert({
    where: { email: 'customer@brightloop.io' },
    update: { userId: demoCustomerUser.id },
    create: {
      userId: demoCustomerUser.id,
      name: 'Acme Traders',
      company: 'Acme Corporation',
      email: 'customer@brightloop.io',
      phone: '+91 98765 43210',
      addressLine1: '42 MG Road, Cyber City',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'IN',
      gstin: '29ABCDE1234F1Z5',
    },
  });

  // Ensure Tax and PaymentTerm
  let tax = await prisma.tax.findFirst({ where: { isDefault: true } });
  if (!tax) {
    tax = await prisma.tax.create({
      data: { name: 'GST 18%', ratePercent: new Decimal(18), isDefault: true },
    });
  }

  let paymentTerm = await prisma.paymentTerm.findFirst({ where: { isDefault: true } });
  if (!paymentTerm) {
    paymentTerm = await prisma.paymentTerm.create({
      data: { name: 'Net 30', days: 30, isDefault: true },
    });
  }

  // Ensure Plans
  const plans = await prisma.plan.findMany();
  let plan = plans[0];
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        name: 'Business Monthly',
        price: new Decimal(1499),
        billingInterval: BillingInterval.MONTHLY,
        validFrom: new Date(Date.UTC(2026, 0, 1)),
        canPause: true,
        canCloseEarly: true,
        canRenew: true,
      },
    });
  }

  // Ensure Product & Variant
  let product = await prisma.product.findFirst({ where: { sku: 'BL-CRM' } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        sku: 'BL-CRM',
        name: 'Brightloop CRM Seat',
        type: ProductType.SERVICE,
        salesPrice: new Decimal(1200),
        costPrice: new Decimal(400),
        defaultTaxId: tax.id,
      },
    });
  }

  // 2. Generate 250 Diverse Customers in Bulk
  console.log('🏢 Seeding 250 customer accounts in bulk...');
  const existingCustCount = await prisma.customer.count();
  const customerIds: string[] = [demoCustomer.id];

  if (existingCustCount < 200) {
    const customerInserts: any[] = [];
    const companies = [
      'Zenith Systems', 'Nexus Tech', 'Apex Solutions', 'Vanguard Retail', 'Horizon Logistics',
      'Pinnacle Health', 'Quantum Dynamics', 'Aura Labs', 'Nova Media', 'Starlight Hospitality',
      'Solaris Green', 'Titan Heavy', 'Orbit Cloud', 'Echo FinTech', 'Crestwood Partners'
    ];

    for (let i = 1; i <= 250; i++) {
      const cid = randomUUID();
      customerIds.push(cid);
      const comp = companies[i % companies.length];
      customerInserts.push({
        id: cid,
        name: `${comp} #${i}`,
        company: `${comp} Pvt Ltd`,
        email: `contact.client${i}@${comp.toLowerCase().replace(/\s+/g, '')}.io`,
        phone: `+91 98${String(10000000 + i).slice(0, 8)}`,
        addressLine1: `${100 + i} Tech Park Way`,
        city: i % 2 === 0 ? 'Bengaluru' : 'Mumbai',
        state: i % 2 === 0 ? 'Karnataka' : 'Maharashtra',
        postalCode: '560001',
        country: 'IN',
        gstin: `29AABC${String(1000 + i).slice(0, 4)}D1Z5`,
      });
    }

    await prisma.customer.createMany({
      data: customerInserts,
      skipDuplicates: true,
    });
  } else {
    const fetched = await prisma.customer.findMany({ select: { id: true }, take: 300 });
    for (const c of fetched) customerIds.push(c.id);
  }

  // 3. Generate 5,000+ Subscriptions
  const currentSubCount = await prisma.subscription.count();
  const subsNeeded = Math.max(0, TARGET_SUBSCRIPTIONS - currentSubCount);
  console.log(`📦 Current subscriptions: ${currentSubCount}. Generating ${subsNeeded} new subscriptions...`);

  const createdSubIds: { id: string; subNumber: string; customerId: string; subtotal: Decimal }[] = [];

  if (subsNeeded > 0) {
    const totalChunks = Math.ceil(subsNeeded / BATCH_CHUNK_SIZE);

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const chunkStart = chunkIdx * BATCH_CHUNK_SIZE;
      const countInChunk = Math.min(BATCH_CHUNK_SIZE, subsNeeded - chunkStart);

      const subRecords: any[] = [];
      const lineRecords: any[] = [];

      for (let j = 0; j < countInChunk; j++) {
        const subIndex = currentSubCount + chunkStart + j + 1;
        const subId = randomUUID();
        const subNumber = `SUB-2026-${String(subIndex).padStart(5, '0')}`;
        const custId = customerIds[subIndex % customerIds.length];

        // Status distribution: 65% ACTIVE, 10% PAUSED, 10% CLOSED, 10% CONFIRMED, 5% QUOTATION
        let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
        const roll = Math.random();
        if (roll < 0.65) status = SubscriptionStatus.ACTIVE;
        else if (roll < 0.75) status = SubscriptionStatus.PAUSED;
        else if (roll < 0.85) status = SubscriptionStatus.CLOSED;
        else if (roll < 0.95) status = SubscriptionStatus.CONFIRMED;
        else status = SubscriptionStatus.QUOTATION;

        const startDate = new Date(Date.UTC(2026, 0, 1 + (subIndex % 60)));
        const expiryDate = new Date(Date.UTC(2027, 0, 1 + (subIndex % 60)));
        const nextBilling = status === SubscriptionStatus.ACTIVE ? new Date(Date.UTC(2026, 10, 1)) : null;

        const recurringSubtotal = new Decimal(7000 + (subIndex % 15) * 500);

        subRecords.push({
          id: subId,
          subNumber,
          customerId: custId,
          planId: plan.id,
          paymentTermId: paymentTerm.id,
          status,
          startDate,
          expiryDate,
          billingAnchorDate: startDate,
          nextBillingDate: nextBilling,
          recurringSubtotal,
          createdById: staff.id,
        });

        lineRecords.push({
          id: randomUUID(),
          subscriptionId: subId,
          productId: product.id,
          description: 'Brightloop CRM Seat (Brand: Odoo)',
          quantity: 5,
          unitPrice: new Decimal(1760),
          taxId: tax.id,
          subtotal: recurringSubtotal,
          sortOrder: 0,
        });

        createdSubIds.push({
          id: subId,
          subNumber,
          customerId: custId,
          subtotal: recurringSubtotal,
        });
      }

      await prisma.subscription.createMany({ data: subRecords, skipDuplicates: true });
      await prisma.subscriptionLine.createMany({ data: lineRecords, skipDuplicates: true });
      console.log(`   -> Seeded subscriptions chunk ${chunkIdx + 1}/${totalChunks} (${countInChunk} rows)`);
    }
  }

  // 4. Generate 10,000+ Invoices & Reconciled Payments
  const currentInvCount = await prisma.invoice.count();
  const targetInvoices = 10500;
  const invNeeded = Math.max(0, targetInvoices - currentInvCount);
  console.log(`🧾 Current invoices: ${currentInvCount}. Generating ${invNeeded} new invoices and payments...`);

  if (invNeeded > 0) {
    const allSubs = await prisma.subscription.findMany({
      select: {
        id: true,
        subNumber: true,
        customerId: true,
        recurringSubtotal: true,
        customer: { select: { name: true, email: true, gstin: true } },
      },
      take: 6000,
    });

    const invChunks = Math.ceil(invNeeded / BATCH_CHUNK_SIZE);

    for (let c = 0; c < invChunks; c++) {
      const chunkSize = Math.min(BATCH_CHUNK_SIZE, invNeeded - c * BATCH_CHUNK_SIZE);
      const invoiceRecords: any[] = [];
      const paymentRecords: any[] = [];
      const today = new Date();

      for (let k = 0; k < chunkSize; k++) {
        const invIndex = currentInvCount + c * BATCH_CHUNK_SIZE + k + 1;
        const sub = allSubs[invIndex % allSubs.length];
        const invoiceId = randomUUID();
        const invoiceNumber = `INV-2026-${String(invIndex).padStart(6, '0')}`;

        // Invoicing status: 70% PAID, 20% CONFIRMED (half overdue), 10% DRAFT
        const r = Math.random();
        let status: InvoiceStatus = InvoiceStatus.PAID;
        let isOverdue = false;
        let invoiceDate = new Date(Date.UTC(2026, 8, 1 + (invIndex % 25)));
        let dueDate = new Date(Date.UTC(2026, 9, 1 + (invIndex % 25)));

        if (r < 0.70) {
          status = InvoiceStatus.PAID;
        } else if (r < 0.90) {
          status = InvoiceStatus.CONFIRMED;
          if (r < 0.80) {
            // Overdue! dueDate before today
            dueDate = new Date(Date.UTC(2026, 8, 15));
            isOverdue = true;
          } else {
            dueDate = new Date(Date.UTC(2026, 11, 15));
          }
        } else {
          status = InvoiceStatus.DRAFT;
        }

        const subtotal = sub ? toDecimal(sub.recurringSubtotal) : new Decimal(8800);
        const taxAmount = subtotal.times(0.18);
        const totalAmount = subtotal.plus(taxAmount);

        let amountPaid = new Decimal(0);
        let amountDue = totalAmount;

        if (status === InvoiceStatus.PAID) {
          amountPaid = totalAmount;
          amountDue = new Decimal(0);
        } else if (status === InvoiceStatus.CONFIRMED && Math.random() < 0.3) {
          // Partial payment
          amountPaid = totalAmount.dividedBy(2).toDecimalPlaces(2);
          amountDue = totalAmount.minus(amountPaid);
        }

        const billingCycleDate = invoiceDate;
        const periodEnd = new Date(invoiceDate);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        invoiceRecords.push({
          id: invoiceId,
          invoiceNumber,
          subscriptionId: sub ? sub.id : createdSubIds[0].id,
          customerId: sub ? sub.customerId : customerIds[0],
          billingCycleDate,
          periodEnd,
          status,
          invoiceDate,
          dueDate,
          billToName: sub?.customer?.name || 'Customer Organization',
          billToEmail: sub?.customer?.email || 'billing@customer.io',
          billToGstin: sub?.customer?.gstin || '29ABCDE1234F1Z5',
          paymentTermName: 'Net 30',
          subtotal,
          discountAmount: new Decimal(0),
          taxAmount,
          totalAmount,
          amountPaid,
          amountDue,
          paidAt: status === InvoiceStatus.PAID ? dueDate : null,
        });

        // Add payment record if paid or partially paid
        if (amountPaid.gt(0)) {
          const methods: PaymentMethod[] = [
            PaymentMethod.UPI,
            PaymentMethod.BANK_TRANSFER,
            PaymentMethod.CARD,
            PaymentMethod.CASH,
          ];
          const method = methods[invIndex % methods.length];

          paymentRecords.push({
            id: randomUUID(),
            invoiceId,
            amount: amountPaid,
            method,
            paymentDate: invoiceDate,
            reference: `UTR-${Date.now().toString().slice(-4)}-${invIndex}`,
            note: 'Automated settlement',
            recordedById: staff.id,
          });
        }
      }

      await prisma.invoice.createMany({ data: invoiceRecords, skipDuplicates: true });
      if (paymentRecords.length > 0) {
        await prisma.payment.createMany({ data: paymentRecords, skipDuplicates: true });
      }
      console.log(`   -> Seeded invoices chunk ${c + 1}/${invChunks} (${chunkSize} rows)`);
    }
  }

  const endTotal = performance.now();
  const [finalSubs, finalInvs, finalPays] = await Promise.all([
    prisma.subscription.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
  ]);

  console.log('====================================================');
  console.log('🎉 HIGH VOLUME SEED COMPLETE!');
  console.log(`   • Total Subscriptions: ${finalSubs.toLocaleString()}`);
  console.log(`   • Total Invoices:      ${finalInvs.toLocaleString()}`);
  console.log(`   • Total Payments:      ${finalPays.toLocaleString()}`);
  console.log(`   • Seeding Duration:    ${Math.round((endTotal - startTotal) / 1000)}s`);
  console.log('====================================================');
}

function toDecimal(val: any): Decimal {
  if (val instanceof Decimal) return val;
  return new Decimal(val || 0);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
