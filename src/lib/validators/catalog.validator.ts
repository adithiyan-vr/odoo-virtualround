import { z } from 'zod';
import { ProductType, BillingInterval } from '@/lib/constants/enums';

// Product schemas
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'Product SKU is required').toUpperCase().trim(),
  type: z.nativeEnum(ProductType).default(ProductType.SERVICE),
  salesPrice: z.number().min(0, 'Sales price must be positive'),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  notes: z.string().optional(),
  defaultTaxId: z.string().uuid().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Variant schemas
export const createVariantSchema = z.object({
  attributeName: z.string().min(1, 'Attribute name is required'),
  attributeValue: z.string().min(1, 'Attribute value is required'),
  priceSurcharge: z.number().min(0, 'Price surcharge must be >= 0').default(0),
});

export const updateVariantSchema = z.object({
  attributeName: z.string().min(1).optional(),
  attributeValue: z.string().min(1).optional(),
  priceSurcharge: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// Plan schemas
export const createPlanSchema = z.object({
  name: z.string().min(2, 'Plan name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be >= 0').default(0),
  billingInterval: z.nativeEnum(BillingInterval),
  minQuantity: z.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid from must be YYYY-MM-DD'),
  validTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid to must be YYYY-MM-DD')
    .optional()
    .nullable(),
  autoClose: z.boolean().default(false),
  canCloseEarly: z.boolean().default(true),
  canPause: z.boolean().default(true),
  canRenew: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Quotation Template schemas
export const quotationTemplateLineSchema = z.object({
  productId: z.string().uuid('Product ID is required'),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  sortOrder: z.number().int().optional().default(0),
});

export const createTemplateSchema = z.object({
  name: z.string().min(2, 'Template name is required'),
  planId: z.string().uuid('Plan ID is required'),
  validityDays: z.number().int().min(1).default(30),
  notes: z.string().optional(),
  lines: z.array(quotationTemplateLineSchema).min(1, 'At least one line is required'),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  planId: z.string().uuid().optional(),
  validityDays: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  lines: z.array(quotationTemplateLineSchema).optional(),
});

// Tax schemas
export const createTaxSchema = z.object({
  name: z.string().min(2, 'Tax name is required'),
  ratePercent: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  isDefault: z.boolean().default(false),
});

export const updateTaxSchema = createTaxSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Payment Term schemas
export const createPaymentTermSchema = z.object({
  name: z.string().min(2, 'Payment term name is required'),
  days: z.number().int().min(0, 'Days must be >= 0'),
  isDefault: z.boolean().default(false),
});

export const updatePaymentTermSchema = createPaymentTermSchema.partial().extend({
  isActive: z.boolean().optional(),
});
