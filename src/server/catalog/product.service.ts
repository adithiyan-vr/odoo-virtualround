import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PaginationParams, buildPaginationMeta } from '@/lib/pagination';
import { Decimal, round2 } from '@/lib/money';
import { recordAuditLog } from '@/lib/audit';
import { ProductType } from '@/lib/constants/enums';

export class ProductService {
  /**
   * List products with variants and tax info
   */
  static async list(params: PaginationParams, includeInactive = false) {
    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' as const } },
              { sku: { contains: params.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.sortBy ? { [params.sortBy]: params.sortOrder || 'asc' } : { name: 'asc' },
        include: {
          defaultTax: true,
          variants: {
            where: includeInactive ? {} : { isActive: true },
          },
        },
      }),
    ]);

    const formattedProducts = products.map((p) => ({
      ...p,
      salesPrice: p.salesPrice.toNumber(),
      costPrice: p.costPrice.toNumber(),
      defaultTax: p.defaultTax
        ? {
            ...p.defaultTax,
            ratePercent: p.defaultTax.ratePercent.toNumber(),
          }
        : null,
      variants: p.variants.map((v) => ({
        ...v,
        priceSurcharge: v.priceSurcharge.toNumber(),
        effectivePrice: round2(new Decimal(p.salesPrice).plus(v.priceSurcharge)).toNumber(),
      })),
    }));

    return {
      products: formattedProducts,
      meta: buildPaginationMeta(total, params.page, params.pageSize),
    };
  }

  /**
   * Get product by ID
   */
  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        defaultTax: true,
        variants: true,
      },
    });

    if (!product) {
      throw AppError.notFound('Product not found');
    }

    return {
      ...product,
      salesPrice: product.salesPrice.toNumber(),
      costPrice: product.costPrice.toNumber(),
      defaultTax: product.defaultTax
        ? {
            ...product.defaultTax,
            ratePercent: product.defaultTax.ratePercent.toNumber(),
          }
        : null,
      variants: product.variants.map((v) => ({
        ...v,
        priceSurcharge: v.priceSurcharge.toNumber(),
        effectivePrice: round2(new Decimal(product.salesPrice).plus(v.priceSurcharge)).toNumber(),
      })),
    };
  }

  /**
   * Create Product
   */
  static async create(
    actorId: string,
    data: {
      name: string;
      sku: string;
      type?: ProductType;
      salesPrice: number;
      costPrice: number;
      notes?: string;
      defaultTaxId?: string | null;
    }
  ) {
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku.toUpperCase().trim() },
    });

    if (existing) {
      throw AppError.conflict(`Product with SKU '${data.sku}' already exists`);
    }

    const product = await prisma.product.create({
      data: {
        name: data.name.trim(),
        sku: data.sku.toUpperCase().trim(),
        type: data.type || ProductType.SERVICE,
        salesPrice: new Decimal(data.salesPrice),
        costPrice: new Decimal(data.costPrice),
        notes: data.notes || null,
        defaultTaxId: data.defaultTaxId || null,
      },
      include: { defaultTax: true },
    });

    await recordAuditLog({
      actorId,
      entity: 'product',
      entityId: product.id,
      action: 'create_product',
      meta: { sku: product.sku, name: product.name },
    });

    return {
      ...product,
      salesPrice: product.salesPrice.toNumber(),
      costPrice: product.costPrice.toNumber(),
      defaultTax: product.defaultTax
        ? {
            ...product.defaultTax,
            ratePercent: product.defaultTax.ratePercent.toNumber(),
          }
        : null,
    };
  }

  /**
   * Update Product
   */
  static async update(
    actorId: string,
    id: string,
    data: {
      name?: string;
      sku?: string;
      type?: ProductType;
      salesPrice?: number;
      costPrice?: number;
      notes?: string;
      defaultTaxId?: string | null;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Product not found');
    }

    if (data.sku && data.sku.toUpperCase() !== existing.sku) {
      const conflict = await prisma.product.findUnique({
        where: { sku: data.sku.toUpperCase().trim() },
      });
      if (conflict) {
        throw AppError.conflict(`Product with SKU '${data.sku}' already exists`);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.sku ? { sku: data.sku.toUpperCase().trim() } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.salesPrice !== undefined ? { salesPrice: new Decimal(data.salesPrice) } : {}),
        ...(data.costPrice !== undefined ? { costPrice: new Decimal(data.costPrice) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.defaultTaxId !== undefined ? { defaultTaxId: data.defaultTaxId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: { defaultTax: true, variants: true },
    });

    await recordAuditLog({
      actorId,
      entity: 'product',
      entityId: id,
      action: 'update_product',
      meta: data,
    });

    return {
      ...updated,
      salesPrice: updated.salesPrice.toNumber(),
      costPrice: updated.costPrice.toNumber(),
    };
  }

  /**
   * Archive / Soft delete
   */
  static async archive(actorId: string, id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw AppError.notFound('Product not found');
    }

    const archived = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAuditLog({
      actorId,
      entity: 'product',
      entityId: id,
      action: 'archive_product',
    });

    return { id: archived.id, isActive: false };
  }

  // ──────────────────────── Variants ────────────────────────

  static async listVariants(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw AppError.notFound('Product not found');
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId, isActive: true },
      orderBy: [{ attributeName: 'asc' }, { attributeValue: 'asc' }],
    });

    return variants.map((v) => ({
      ...v,
      priceSurcharge: v.priceSurcharge.toNumber(),
      effectivePrice: round2(new Decimal(product.salesPrice).plus(v.priceSurcharge)).toNumber(),
    }));
  }

  static async createVariant(
    actorId: string,
    productId: string,
    data: {
      attributeName: string;
      attributeValue: string;
      priceSurcharge?: number;
    }
  ) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw AppError.notFound('Product not found');
    }

    const existing = await prisma.productVariant.findUnique({
      where: {
        productId_attributeName_attributeValue: {
          productId,
          attributeName: data.attributeName.trim(),
          attributeValue: data.attributeValue.trim(),
        },
      },
    });

    if (existing) {
      throw AppError.conflict(
        `Variant '${data.attributeName}: ${data.attributeValue}' already exists for this product`
      );
    }

    const surcharge = new Decimal(data.priceSurcharge ?? 0);

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        attributeName: data.attributeName.trim(),
        attributeValue: data.attributeValue.trim(),
        priceSurcharge: surcharge,
      },
    });

    await recordAuditLog({
      actorId,
      entity: 'product_variant',
      entityId: variant.id,
      action: 'create_variant',
      meta: { productId, attributeName: variant.attributeName, attributeValue: variant.attributeValue },
    });

    return {
      ...variant,
      priceSurcharge: variant.priceSurcharge.toNumber(),
      effectivePrice: round2(new Decimal(product.salesPrice).plus(surcharge)).toNumber(),
    };
  }

  static async updateVariant(
    actorId: string,
    variantId: string,
    data: {
      attributeName?: string;
      attributeValue?: string;
      priceSurcharge?: number;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!existing) {
      throw AppError.notFound('Product variant not found');
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(data.attributeName ? { attributeName: data.attributeName.trim() } : {}),
        ...(data.attributeValue ? { attributeValue: data.attributeValue.trim() } : {}),
        ...(data.priceSurcharge !== undefined ? { priceSurcharge: new Decimal(data.priceSurcharge) } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    await recordAuditLog({
      actorId,
      entity: 'product_variant',
      entityId: variantId,
      action: 'update_variant',
      meta: data,
    });

    return {
      ...updated,
      priceSurcharge: updated.priceSurcharge.toNumber(),
      effectivePrice: round2(new Decimal(existing.product.salesPrice).plus(updated.priceSurcharge)).toNumber(),
    };
  }

  static async deleteVariant(actorId: string, variantId: string) {
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) {
      throw AppError.notFound('Product variant not found');
    }

    // Soft delete / archive
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });

    await recordAuditLog({
      actorId,
      entity: 'product_variant',
      entityId: variantId,
      action: 'archive_variant',
    });

    return { id: variantId, isActive: false };
  }
}
