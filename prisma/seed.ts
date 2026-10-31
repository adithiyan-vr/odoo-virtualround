import { PrismaClient, Role, ProductType, BillingInterval, DiscountType, DiscountScope } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Brightloop database seed...');

  // 1. Password hashing (cost 12)
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 12);
  const staffPasswordHash = await bcrypt.hash('Staff@12345', 12);
  const customerPasswordHash = await bcrypt.hash('Customer@12345', 12);

  // 2. Demo Users
  console.log('👤 Seeding demo users...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@brightloop.io' },
    update: { passwordHash: adminPasswordHash, isActive: true },
    create: {
      name: 'Brightloop Admin',
      email: 'admin@brightloop.io',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@brightloop.io' },
    update: { passwordHash: staffPasswordHash, isActive: true },
    create: {
      name: 'Brightloop Staff',
      email: 'staff@brightloop.io',
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
      isActive: true,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@brightloop.io' },
    update: { passwordHash: customerPasswordHash, isActive: true },
    create: {
      name: 'Acme Traders',
      email: 'customer@brightloop.io',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  // Link Customer Profile
  const customerProfile = await prisma.customer.upsert({
    where: { email: 'customer@brightloop.io' },
    update: { userId: customerUser.id, name: 'Acme Traders', company: 'Acme Traders Ltd' },
    create: {
      userId: customerUser.id,
      name: 'Acme Traders',
      company: 'Acme Traders Ltd',
      email: 'customer@brightloop.io',
      phone: '+91 98765 43210',
      addressLine1: '123 Market Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'IN',
      gstin: '29ABCDE1234F1Z5',
    },
  });

  // 3. Taxes
  console.log('📊 Seeding tax rules...');
  const taxesData = [
    { name: 'Exempt 0%', ratePercent: new Decimal(0), isDefault: false },
    { name: 'GST 5%', ratePercent: new Decimal(5), isDefault: false },
    { name: 'GST 12%', ratePercent: new Decimal(12), isDefault: false },
    { name: 'GST 18%', ratePercent: new Decimal(18), isDefault: true },
    { name: 'GST 28%', ratePercent: new Decimal(28), isDefault: false },
  ];

  const taxMap = new Map<string, string>();
  for (const t of taxesData) {
    const existing = await prisma.tax.findFirst({ where: { name: t.name } });
    if (existing) {
      taxMap.set(t.name, existing.id);
    } else {
      const created = await prisma.tax.create({ data: t });
      taxMap.set(t.name, created.id);
    }
  }

  const defaultTaxId = taxMap.get('GST 18%')!;

  // 4. Payment Terms
  console.log('💳 Seeding payment terms...');
  const paymentTermsData = [
    { name: 'Immediate', days: 0, isDefault: false },
    { name: 'Net 15', days: 15, isDefault: false },
    { name: 'Net 30', days: 30, isDefault: true },
    { name: 'Net 60', days: 60, isDefault: false },
  ];

  const termMap = new Map<string, string>();
  for (const term of paymentTermsData) {
    const existing = await prisma.paymentTerm.findFirst({ where: { name: term.name } });
    if (existing) {
      termMap.set(term.name, existing.id);
    } else {
      const created = await prisma.paymentTerm.create({ data: term });
      termMap.set(term.name, created.id);
    }
  }

  // 5. Products & Variants
  console.log('📦 Seeding products & variants...');
  const productsData = [
    {
      sku: 'BL-CRM',
      name: 'Brightloop CRM Seat',
      type: ProductType.SERVICE,
      salesPrice: new Decimal(1200),
      costPrice: new Decimal(400),
      notes: 'Core CRM suite per seat',
      defaultTaxId,
      variants: [
        { attributeName: 'Brand', attributeValue: 'Brightloop', priceSurcharge: new Decimal(0) },
        { attributeName: 'Brand', attributeValue: 'Odoo', priceSurcharge: new Decimal(560) },
        { attributeName: 'Brand', attributeValue: 'Custom', priceSurcharge: new Decimal(900) },
      ],
    },
    {
      sku: 'BL-BILL',
      name: 'Billing Automation Suite',
      type: ProductType.SERVICE,
      salesPrice: new Decimal(3500),
      costPrice: new Decimal(1200),
      notes: 'Automated recurring billing engine',
      defaultTaxId,
      variants: [],
    },
    {
      sku: 'BL-ANL',
      name: 'Analytics Add-on',
      type: ProductType.SERVICE,
      salesPrice: new Decimal(800),
      costPrice: new Decimal(200),
      notes: 'Advanced reporting & forecasting',
      defaultTaxId,
      variants: [],
    },
    {
      sku: 'BL-SUP',
      name: 'Priority Support Pack',
      type: ProductType.SERVICE,
      salesPrice: new Decimal(1500),
      costPrice: new Decimal(500),
      notes: '24/7 dedicated support escalation',
      defaultTaxId,
      variants: [],
    },
    {
      sku: 'BL-POS',
      name: 'Brightloop POS Terminal',
      type: ProductType.STORABLE,
      salesPrice: new Decimal(14999),
      costPrice: new Decimal(9500),
      notes: 'Hardware terminal for retail counters',
      defaultTaxId,
      variants: [
        { attributeName: 'Colour', attributeValue: 'Black', priceSurcharge: new Decimal(0) },
        { attributeName: 'Colour', attributeValue: 'White', priceSurcharge: new Decimal(300) },
      ],
    },
  ];

  const productMap = new Map<string, string>();
  const variantMap = new Map<string, string>();

  for (const prod of productsData) {
    let p = await prisma.product.findUnique({ where: { sku: prod.sku } });
    if (!p) {
      p = await prisma.product.create({
        data: {
          sku: prod.sku,
          name: prod.name,
          type: prod.type,
          salesPrice: prod.salesPrice,
          costPrice: prod.costPrice,
          notes: prod.notes,
          defaultTaxId: prod.defaultTaxId,
        },
      });
    }
    productMap.set(prod.sku, p.id);

    for (const v of prod.variants) {
      const key = `${prod.sku}:${v.attributeName}:${v.attributeValue}`;
      let variant = await prisma.productVariant.findUnique({
        where: {
          productId_attributeName_attributeValue: {
            productId: p.id,
            attributeName: v.attributeName,
            attributeValue: v.attributeValue,
          },
        },
      });
      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            productId: p.id,
            attributeName: v.attributeName,
            attributeValue: v.attributeValue,
            priceSurcharge: v.priceSurcharge,
          },
        });
      }
      variantMap.set(key, variant.id);
    }
  }

  // 6. Plans
  console.log('📋 Seeding plans...');
  const today = new Date();
  const validFrom = new Date(Date.UTC(today.getFullYear(), 0, 1));
  const week8Later = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 56));

  const plansData = [
    {
      name: 'Starter Monthly',
      description: 'Ideal for small shops and freelancers',
      billingInterval: BillingInterval.MONTHLY,
      price: new Decimal(499),
      minQuantity: 1,
      validFrom,
      validTo: null,
      autoClose: false,
      canCloseEarly: true,
      canPause: true,
      canRenew: true,
    },
    {
      name: 'Business Monthly',
      description: 'Standard plan for growing businesses',
      billingInterval: BillingInterval.MONTHLY,
      price: new Decimal(1499),
      minQuantity: 5,
      validFrom,
      validTo: null,
      autoClose: false,
      canCloseEarly: true,
      canPause: true,
      canRenew: true,
    },
    {
      name: 'Business Yearly',
      description: 'Annual commitment with discount',
      billingInterval: BillingInterval.YEARLY,
      price: new Decimal(14999),
      minQuantity: 5,
      validFrom,
      validTo: null,
      autoClose: true,
      canCloseEarly: false,
      canPause: false,
      canRenew: true,
    },
    {
      name: 'Enterprise Yearly',
      description: 'High volume enterprise license',
      billingInterval: BillingInterval.YEARLY,
      price: new Decimal(49999),
      minQuantity: 25,
      validFrom,
      validTo: null,
      autoClose: false,
      canCloseEarly: false,
      canPause: false,
      canRenew: true,
    },
    {
      name: 'Weekly Sprint',
      description: 'Short term project sprint cadence',
      billingInterval: BillingInterval.WEEKLY,
      price: new Decimal(299),
      minQuantity: 1,
      validFrom,
      validTo: week8Later,
      autoClose: true,
      canCloseEarly: true,
      canPause: true,
      canRenew: true,
    },
    {
      name: 'Daily Pass',
      description: 'Single day on-demand access',
      billingInterval: BillingInterval.DAILY,
      price: new Decimal(49),
      minQuantity: 1,
      validFrom,
      validTo: null,
      autoClose: true,
      canCloseEarly: true,
      canPause: false,
      canRenew: false,
    },
  ];

  const planMap = new Map<string, string>();
  for (const pl of plansData) {
    let plan = await prisma.plan.findFirst({ where: { name: pl.name } });
    if (!plan) {
      plan = await prisma.plan.create({ data: pl });
    }
    planMap.set(pl.name, plan.id);
  }

  // 7. Quotation Templates
  console.log('📝 Seeding quotation templates...');
  const templatesData = [
    {
      name: 'Small Shop Starter',
      planId: planMap.get('Starter Monthly')!,
      validityDays: 15,
      notes: '2 CRM seats included',
      lines: [{ productId: productMap.get('BL-CRM')!, quantity: 2, sortOrder: 0 }],
    },
    {
      name: 'Business Team Pack',
      planId: planMap.get('Business Monthly')!,
      validityDays: 30,
      notes: '5 CRM seats + Analytics add-on',
      lines: [
        {
          productId: productMap.get('BL-CRM')!,
          variantId: variantMap.get('BL-CRM:Brand:Odoo'),
          quantity: 5,
          sortOrder: 0,
        },
        { productId: productMap.get('BL-ANL')!, quantity: 1, sortOrder: 1 },
      ],
    },
    {
      name: 'Enterprise Annual',
      planId: planMap.get('Enterprise Yearly')!,
      validityDays: 45,
      notes: '25 CRM seats + Priority support',
      lines: [
        { productId: productMap.get('BL-CRM')!, quantity: 25, sortOrder: 0 },
        { productId: productMap.get('BL-SUP')!, quantity: 1, sortOrder: 1 },
      ],
    },
  ];

  for (const t of templatesData) {
    const existing = await prisma.quotationTemplate.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.quotationTemplate.create({
        data: {
          name: t.name,
          planId: t.planId,
          validityDays: t.validityDays,
          notes: t.notes,
          lines: {
            create: t.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId || null,
              quantity: l.quantity,
              sortOrder: l.sortOrder,
            })),
          },
        },
      });
    }
  }

  // 8. Discounts (M2 baseline)
  console.log('🏷️ Seeding discount rules...');
  const crmProductId = productMap.get('BL-CRM')!;
  const expiredEndDate = new Date(Date.UTC(2026, 4, 1)); // May 1, 2026

  const discountsData = [
    {
      name: 'Seat Saver 10%',
      type: DiscountType.PERCENT,
      value: new Decimal(10),
      scope: DiscountScope.PRODUCT,
      minQuantity: 5,
      minPurchase: null,
      startDate: validFrom,
      endDate: null,
      maxUses: null,
      autoApply: true,
      productIds: [crmProductId],
    },
    {
      name: 'Welcome ₹500',
      code: 'WELCOME500',
      type: DiscountType.FIXED,
      value: new Decimal(500),
      scope: DiscountScope.SUBSCRIPTION,
      minQuantity: null,
      minPurchase: new Decimal(5000),
      startDate: validFrom,
      endDate: null,
      maxUses: 100,
      autoApply: false,
      productIds: [],
    },
    {
      name: 'Yearly Loyalty 15%',
      type: DiscountType.PERCENT,
      value: new Decimal(15),
      scope: DiscountScope.SUBSCRIPTION,
      minQuantity: null,
      minPurchase: new Decimal(20000),
      startDate: validFrom,
      endDate: null,
      maxUses: null,
      autoApply: false,
      productIds: [],
    },
    {
      name: 'Flash 20% (Expired)',
      type: DiscountType.PERCENT,
      value: new Decimal(20),
      scope: DiscountScope.SUBSCRIPTION,
      minQuantity: null,
      minPurchase: null,
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: expiredEndDate,
      maxUses: 50,
      autoApply: false,
      productIds: [],
    },
    {
      name: 'Limited 3 Uses',
      type: DiscountType.PERCENT,
      value: new Decimal(10),
      scope: DiscountScope.SUBSCRIPTION,
      minQuantity: null,
      minPurchase: null,
      startDate: validFrom,
      endDate: null,
      maxUses: 3,
      currentUses: 2,
      autoApply: false,
      productIds: [],
    },
  ];

  for (const d of discountsData) {
    const existing = await prisma.discount.findFirst({ where: { name: d.name } });
    if (!existing) {
      await prisma.discount.create({
        data: {
          name: d.name,
          code: d.code || null,
          type: d.type,
          value: d.value,
          scope: d.scope,
          minQuantity: d.minQuantity,
          minPurchase: d.minPurchase,
          startDate: d.startDate,
          endDate: d.endDate,
          maxUses: d.maxUses,
          currentUses: d.currentUses || 0,
          autoApply: d.autoApply,
          products: {
            create: d.productIds.map((pid) => ({ productId: pid })),
          },
        },
      });
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('👑 Admin:    admin@brightloop.io    / Admin@12345');
  console.log('👔 Staff:    staff@brightloop.io    / Staff@12345');
  console.log('🛍️ Customer: customer@brightloop.io / Customer@12345');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
