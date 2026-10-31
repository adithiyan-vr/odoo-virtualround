'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { catalogApi, type Product, type ProductVariant, type TaxRule } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PricePreview } from '@/components/shared/price-preview';
import { toast } from '@/components/ui/toast';
import { formatMoney } from '@/lib/format';
import { ArrowLeft, Save, Plus, Trash2, Sparkles, Layers } from 'lucide-react';

interface ProductFormProps {
  initialProduct?: Product;
  productId?: string;
}

export function ProductForm({ initialProduct, productId }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(productId);

  const [name, setName] = useState(initialProduct?.name || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [type, setType] = useState<'SERVICE' | 'STORABLE'>(initialProduct?.type || 'SERVICE');
  const [salesPrice, setSalesPrice] = useState<number>(Number(initialProduct?.salesPrice) || 1200);
  const [costPrice, setCostPrice] = useState<number>(Number(initialProduct?.costPrice) || 400);
  const [notes, setNotes] = useState(initialProduct?.notes || '');
  const [defaultTaxId, setDefaultTaxId] = useState(initialProduct?.defaultTaxId || '');
  const [isActive, setIsActive] = useState(initialProduct?.isActive ?? true);

  const [variants, setVariants] = useState<Partial<ProductVariant>[]>(
    initialProduct?.variants || []
  );
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load taxes and product details if editing
  useEffect(() => {
    async function loadData() {
      try {
        const taxList = await catalogApi.getTaxes();
        setTaxes(taxList);
        if (!defaultTaxId && taxList.length > 0) {
          const def = taxList.find((t) => t.isDefault) || taxList[0];
          setDefaultTaxId(def.id);
        }

        if (productId && !initialProduct) {
          const prod = await catalogApi.getProduct(productId);
          if (prod) {
            setName(prod.name);
            setSku(prod.sku);
            setType(prod.type);
            setSalesPrice(Number(prod.salesPrice) || 0);
            setCostPrice(Number(prod.costPrice) || 0);
            setNotes(prod.notes || '');
            setDefaultTaxId(prod.defaultTaxId || '');
            setIsActive(prod.isActive);
            setVariants(prod.variants || []);
          }
        }
      } catch {
        // Fallback
      }
    }
    loadData();
  }, [productId, initialProduct, defaultTaxId]);

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        attributeName: 'Brand',
        attributeValue: '',
        priceSurcharge: 0,
        isActive: true,
      },
    ]);
  };

  const handleAddOdooPreset = () => {
    setVariants([
      ...variants,
      {
        attributeName: 'Brand',
        attributeValue: 'Odoo',
        priceSurcharge: 560,
        isActive: true,
      },
    ]);
    toast.info('Variant Added', 'Brand: Odoo (+₹560 surcharge) added to variant table.');
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleVariantChange = (
    idx: number,
    field: keyof ProductVariant,
    val: unknown
  ) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [field]: val };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: Partial<Product> = {
        name,
        sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
        type,
        salesPrice,
        costPrice,
        notes,
        defaultTaxId: defaultTaxId || null,
        isActive,
      };

      let savedProduct: Product;
      if (isEdit && productId) {
        savedProduct = await catalogApi.updateProduct(productId, payload);
      } else {
        savedProduct = await catalogApi.createProduct(payload);
      }

      // Save variants if new or edited
      if (savedProduct?.id && variants.length > 0) {
        for (const v of variants) {
          if (!v.id) {
            await catalogApi.createVariant(savedProduct.id, {
              attributeName: v.attributeName || 'Option',
              attributeValue: v.attributeValue || 'Standard',
              priceSurcharge: Number(v.priceSurcharge) || 0,
              isActive: true,
            });
          }
        }
      }

      toast.success(
        isEdit ? 'Product Updated' : 'Product Created',
        `${name} has been saved successfully.`
      );
      router.push('/products');
    } catch (err: unknown) {
      toast.error(
        'Save Failed',
        err instanceof Error ? err.message : 'Unable to save product'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const primaryVariantSurcharge = variants[0]?.priceSurcharge ?? 0;
  const primaryVariantName = variants[0]
    ? `${variants[0].attributeName || 'Variant'}: ${variants[0].attributeValue || 'Custom'}`
    : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      {/* Header with Back & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-9 h-9 p-0 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
              {isEdit ? `Edit ${name || 'Product'}` : 'New Product / Service'}
            </h1>
            <p className="text-xs text-[#6B6B6B]">
              Configure base pricing, taxes and attribute surcharges.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/products">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
            <Save className="w-4 h-4" /> Save Product
          </Button>
        </div>
      </div>

      {/* Two Column Layout per DESIGN.md §5.3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Form & Variants */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Product Name"
                  required
                  placeholder="e.g. Brightloop CRM Suite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="SKU / Internal Code"
                  placeholder="e.g. CRM-SEAT-01"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  helperText="Leave empty to auto-generate"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Product Type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'SERVICE' | 'STORABLE')}
                >
                  <option value="SERVICE">Service (Digital / SaaS)</option>
                  <option value="STORABLE">Storable (Physical Item)</option>
                </Select>

                <Input
                  label="Sales Price (Base ₹)"
                  type="number"
                  step="0.01"
                  required
                  value={salesPrice}
                  onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
                />

                <Input
                  label="Cost Price (₹)"
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <Select
                label="Default Tax Rate"
                value={defaultTaxId}
                onChange={(e) => setDefaultTaxId(e.target.value)}
              >
                <option value="">No Tax (0%)</option>
                {taxes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.ratePercent}%)
                  </option>
                ))}
              </Select>

              <Textarea
                label="Notes / Terms"
                placeholder="Internal notes, warranty, or customer-facing description..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Variants Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#FF6A1A]" />
                  <span>Attribute Variants & Surcharges</span>
                </CardTitle>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Attributes modify effective sales price (e.g. Brand = Odoo adds +₹560 surcharge).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddOdooPreset}
                  className="gap-1 text-xs text-[#C2410C]"
                >
                  <Sparkles className="w-3.5 h-3.5" /> + Odoo (+₹560)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddVariant}
                  className="gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {variants.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-[#E7E7E3] rounded-2xl bg-[#F7F7F5]">
                  <p className="text-xs text-[#6B6B6B]">
                    No variants added. This product sells at the base standard price.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddOdooPreset}
                    className="mt-2 text-xs font-bold text-[#FF6A1A] hover:underline cursor-pointer"
                  >
                    Quick Add Brand: Odoo (+₹560 surcharge)
                  </button>
                </div>
              ) : (
                <div className="border border-[#E7E7E3] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
                        <th className="py-2.5 px-3">Attribute Name</th>
                        <th className="py-2.5 px-3">Attribute Value</th>
                        <th className="py-2.5 px-3 text-right">Price Surcharge (₹)</th>
                        <th className="py-2.5 px-3 text-right">Effective Price</th>
                        <th className="py-2.5 px-2 w-10 text-center" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E3]">
                      {variants.map((v, idx) => {
                        const surcharge = Number(v.priceSurcharge) || 0;
                        const effective = salesPrice + surcharge;

                        return (
                          <tr key={idx} className="hover:bg-[#F7F7F5]/50">
                            <td className="p-2 px-3">
                              <input
                                type="text"
                                placeholder="e.g. Brand"
                                value={v.attributeName || ''}
                                onChange={(e) =>
                                  handleVariantChange(idx, 'attributeName', e.target.value)
                                }
                                className="w-full h-8 px-2 bg-white border border-[#E7E7E3] rounded-lg text-xs"
                              />
                            </td>
                            <td className="p-2 px-3">
                              <input
                                type="text"
                                placeholder="e.g. Odoo"
                                value={v.attributeValue || ''}
                                onChange={(e) =>
                                  handleVariantChange(idx, 'attributeValue', e.target.value)
                                }
                                className="w-full h-8 px-2 bg-white border border-[#E7E7E3] rounded-lg text-xs"
                              />
                            </td>
                            <td className="p-2 px-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={v.priceSurcharge || ''}
                                onChange={(e) =>
                                  handleVariantChange(
                                    idx,
                                    'priceSurcharge',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24 h-8 px-2 text-right bg-white border border-[#E7E7E3] rounded-lg text-xs tabular-nums"
                              />
                            </td>
                            <td className="p-2 px-3 text-right font-bold text-[#0E0E0E] tabular-nums">
                              {formatMoney(effective)}
                            </td>
                            <td className="p-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(idx)}
                                className="p-1 text-[#9A9A9A] hover:text-[#DC2626] rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Live Price Preview & Status */}
        <div className="space-y-6">
          {/* Price Preview Widget */}
          <PricePreview
            basePrice={salesPrice}
            surcharge={primaryVariantSurcharge}
            variantName={primaryVariantName}
          />

          {/* Status & Publication Card */}
          <Card>
            <CardHeader>
              <CardTitle>Catalog Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
                <div>
                  <span className="text-xs font-bold text-[#0E0E0E] block">
                    Product Active
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Available for quotations and subscriptions.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#F1F1EE] rounded-xl text-xs space-y-1 text-[#6B6B6B]">
                <div className="flex justify-between">
                  <span>Gross Margin:</span>
                  <span className="font-semibold text-[#0E0E0E] tabular-nums">
                    {formatMoney(salesPrice - costPrice)} (
                    {salesPrice > 0
                      ? Math.round(((salesPrice - costPrice) / salesPrice) * 100)
                      : 0}
                    %)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

