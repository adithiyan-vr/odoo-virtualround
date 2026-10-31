'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { type Product, type ProductVariant, type TaxRule } from '@/lib/api-client';
import { Plus, Trash2, Lock } from 'lucide-react';

export interface EditableLine {
  id?: string;
  productId: string;
  productName?: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  taxId?: string | null;
  taxRate?: number;
  isPlanFee?: boolean;
}

interface LineEditorProps {
  lines: EditableLine[];
  products: Product[];
  taxes?: TaxRule[];
  onChange: (lines: EditableLine[]) => void;
  disabled?: boolean;
}

export function LineEditor({
  lines,
  products,
  taxes = [],
  onChange,
  disabled = false,
}: LineEditorProps) {
  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      productId,
      productName: prod.name,
      variantId: null,
      variantName: null,
      unitPrice: Number(prod.salesPrice) || 0,
      taxId: prod.defaultTaxId || (taxes[0]?.id ?? null),
      taxRate: taxes.find((t) => t.id === prod.defaultTaxId)?.ratePercent
        ? Number(taxes.find((t) => t.id === prod.defaultTaxId)?.ratePercent)
        : Number(taxes[0]?.ratePercent || 18),
    };
    onChange(newLines);
  };

  const handleVariantChange = (index: number, variantId: string) => {
    const line = lines[index];
    const prod = products.find((p) => p.id === line.productId);
    if (!prod) return;

    const variant = prod.variants?.find((v) => v.id === variantId);
    const surcharge = variant ? Number(variant.priceSurcharge) : 0;
    const base = Number(prod.salesPrice) || 0;

    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      variantId: variantId || null,
      variantName: variant ? `${variant.attributeName}: ${variant.attributeValue}` : null,
      unitPrice: base + surcharge,
    };
    onChange(newLines);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const safeQty = Math.max(1, qty);
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], quantity: safeQty };
    onChange(newLines);
  };

  const handleUnitPriceChange = (index: number, price: number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], unitPrice: Math.max(0, price) };
    onChange(newLines);
  };

  const handleTaxChange = (index: number, taxId: string) => {
    const tax = taxes.find((t) => t.id === taxId);
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      taxId: taxId || null,
      taxRate: tax ? Number(tax.ratePercent) : 0,
    };
    onChange(newLines);
  };

  const handleAddLine = () => {
    const firstProd = products[0];
    const defaultTax = taxes.find((t) => t.isDefault) || taxes[0];
    const newLine: EditableLine = {
      productId: firstProd?.id || '',
      productName: firstProd?.name || 'Select Product',
      variantId: null,
      quantity: 1,
      unitPrice: firstProd ? Number(firstProd.salesPrice) : 0,
      taxId: defaultTax?.id || null,
      taxRate: defaultTax ? Number(defaultTax.ratePercent) : 18,
    };
    onChange([...lines, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="border border-[#E7E7E3] rounded-2xl overflow-hidden bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
              <th className="py-3 px-4">Item / Product</th>
              <th className="py-3 px-3">Variant (Attribute)</th>
              <th className="py-3 px-3 text-center w-24">Qty</th>
              <th className="py-3 px-3 text-right w-32">Unit Price</th>
              <th className="py-3 px-3 w-28">Tax Rate</th>
              <th className="py-3 px-4 text-right w-32">Subtotal</th>
              {!disabled && <th className="py-3 px-3 w-12 text-center" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E7E3]">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#9A9A9A]">
                  No lines added yet. Click &quot;Add Product Line&quot; below.
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => {
                const prod = products.find((p) => p.id === line.productId);
                const subtotal = line.quantity * line.unitPrice;

                return (
                  <tr key={idx} className="hover:bg-[#F7F7F5]/50">
                    {/* Product */}
                    <td className="py-2.5 px-4">
                      {line.isPlanFee ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0E0E0E]">{line.productName}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF4EC] text-[#C2410C] text-[10px] font-bold">
                            <Lock className="w-2.5 h-2.5" /> Plan Fee
                          </span>
                        </div>
                      ) : disabled ? (
                        <span className="font-medium text-[#0E0E0E]">{line.productName}</span>
                      ) : (
                        <select
                          value={line.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full h-9 px-2.5 bg-white border border-[#E7E7E3] rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#FF6A1A] cursor-pointer"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatMoney(p.salesPrice)})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Variant */}
                    <td className="py-2.5 px-3">
                      {line.isPlanFee ? (
                        <span className="text-[#9A9A9A]">—</span>
                      ) : disabled ? (
                        <span className="text-[#6B6B6B]">{line.variantName || 'Standard'}</span>
                      ) : (
                        <select
                          value={line.variantId || ''}
                          disabled={!prod?.variants || prod.variants.length === 0}
                          onChange={(e) => handleVariantChange(idx, e.target.value)}
                          className="w-full h-9 px-2.5 bg-white border border-[#E7E7E3] rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#FF6A1A] disabled:bg-[#F7F7F5] disabled:text-[#9A9A9A] cursor-pointer"
                        >
                          <option value="">Standard (No surcharge)</option>
                          {prod?.variants?.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.attributeName}: {v.attributeValue} (+{formatMoney(v.priceSurcharge)})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="py-2.5 px-3 text-center">
                      {line.isPlanFee || disabled ? (
                        <span className="font-semibold tabular-nums text-[#0E0E0E]">
                          {line.quantity}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                          className="w-16 h-9 px-2 text-center bg-white border border-[#E7E7E3] rounded-lg text-xs font-semibold tabular-nums focus:ring-1 focus:ring-[#FF6A1A]"
                        />
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="py-2.5 px-3 text-right">
                      {line.isPlanFee || disabled ? (
                        <span className="font-semibold tabular-nums text-[#0E0E0E]">
                          {formatMoney(line.unitPrice)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleUnitPriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-24 h-9 px-2 text-right bg-white border border-[#E7E7E3] rounded-lg text-xs font-semibold tabular-nums focus:ring-1 focus:ring-[#FF6A1A]"
                        />
                      )}
                    </td>

                    {/* Tax */}
                    <td className="py-2.5 px-3">
                      {disabled ? (
                        <span className="text-[#6B6B6B]">{line.taxRate}%</span>
                      ) : (
                        <select
                          value={line.taxId || ''}
                          onChange={(e) => handleTaxChange(idx, e.target.value)}
                          className="w-full h-9 px-2 bg-white border border-[#E7E7E3] rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#FF6A1A] cursor-pointer"
                        >
                          {taxes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.ratePercent}%)
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#0E0E0E]">
                      {formatMoney(subtotal)}
                    </td>

                    {/* Delete action */}
                    {!disabled && (
                      <td className="py-2.5 px-3 text-center">
                        {!line.isPlanFee && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-[#9A9A9A] hover:text-[#DC2626] rounded-md transition-colors cursor-pointer"
                            aria-label="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAddLine}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Product Line
        </Button>
      )}
    </div>
  );
}

