'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { discountApi, catalogApi, type Discount, type Product } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, Save, Sparkles, Tag } from 'lucide-react';

export function DiscountForm({ discountId }: { discountId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(discountId);

  const [name, setName] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState<number>(10);
  const [scope, setScope] = useState<'SUBSCRIPTION' | 'PRODUCT'>('SUBSCRIPTION');
  const [targetProductId, setTargetProductId] = useState('');
  const [minPurchase, setMinPurchase] = useState<number>(0);
  const [minQty, setMinQty] = useState<number>(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxUses, setMaxUses] = useState<number>(100);
  const [autoApply, setAutoApply] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const prodRes = await catalogApi.getProducts({ pageSize: 100 });
        setProducts(prodRes.data || []);

        if (discountId) {
          const d = await discountApi.getDiscount(discountId);
          if (d) {
            setName(d.name);
            setType(d.type);
            setValue(Number(d.value));
            setScope(d.scope);
            setTargetProductId(d.targetProductId || '');
            setMinPurchase(Number(d.minPurchase) || 0);
            setMinQty(d.minQty || 1);
            setStartDate(d.startDate || '');
            setEndDate(d.endDate || '');
            setMaxUses(d.maxUses || 100);
            setAutoApply(d.autoApply ?? true);
          }
        }
      } catch {
        // Fallback
      }
    }
    loadData();
  }, [discountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: Partial<Discount> = {
        name,
        type,
        value,
        scope,
        targetProductId: scope === 'PRODUCT' ? targetProductId || null : null,
        minPurchase: minPurchase > 0 ? minPurchase : null,
        minQty: minQty > 0 ? minQty : null,
        startDate: startDate || null,
        endDate: endDate || null,
        maxUses: maxUses > 0 ? maxUses : null,
        autoApply,
        isActive: true,
      };

      if (isEdit && discountId) {
        await discountApi.updateDiscount(discountId, payload);
      } else {
        await discountApi.createDiscount(payload);
      }

      toast.success(
        isEdit ? 'Discount Updated' : 'Discount Created',
        `${name} discount rule saved.`
      );
      router.push('/discounts');
    } catch (err: unknown) {
      toast.error('Save Failed', err instanceof Error ? err.message : 'Unable to save discount rule');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/discounts">
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
              {isEdit ? `Edit ${name || 'Discount'}` : 'New Discount Rule'}
            </h1>
            <p className="text-xs text-[#6B6B6B]">
              Define promotion criteria, percentage or fixed discount, and automatic application.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/discounts">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
            <Save className="w-4 h-4" /> Save Discount
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Benefit Definition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Rule Name / Promotion Label"
                required
                placeholder="e.g. Q4 High-Volume 15% Waiver"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Discount Type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'PERCENT' | 'FIXED')}
                >
                  <option value="PERCENT">Percentage (%) Off</option>
                  <option value="FIXED">Fixed Amount (₹) Off</option>
                </Select>

                <Input
                  label={type === 'PERCENT' ? 'Percentage Off (%)' : 'Fixed Amount Off (₹)'}
                  type="number"
                  step="0.01"
                  min="0"
                  max={type === 'PERCENT' ? '100' : undefined}
                  required
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7E7E3]">
                <Select
                  label="Evaluation Scope"
                  value={scope}
                  onChange={(e) =>
                    setScope(e.target.value as 'SUBSCRIPTION' | 'PRODUCT')
                  }
                >
                  <option value="SUBSCRIPTION">Whole Subscription Subtotal</option>
                  <option value="PRODUCT">Specific Product Lines Only</option>
                </Select>

                {scope === 'PRODUCT' && (
                  <Select
                    label="Target Product"
                    value={targetProductId}
                    onChange={(e) => setTargetProductId(e.target.value)}
                  >
                    <option value="">Select Target Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualification Thresholds & Windows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Minimum Purchase Amount (₹)"
                  type="number"
                  step="0.01"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(parseFloat(e.target.value) || 0)}
                  helperText="0 = No minimum spend required"
                />
                <Input
                  label="Minimum Quantity (Units)"
                  type="number"
                  min="0"
                  value={minQty}
                  onChange={(e) => setMinQty(parseInt(e.target.value) || 0)}
                  helperText="0 or 1 = No minimum seat count required"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7E7E3]">
                <Input
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  helperText="Leave empty for immediate activation"
                />
                <Input
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  helperText="Leave empty for indefinite duration"
                />
              </div>

              <Input
                label="Maximum Total Uses (Quota)"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
                helperText="Leave blank or 0 for unlimited uses. Stops automatically when quota is reached."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF6A1A]" /> Automated Invoicing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
                <div>
                  <span className="text-xs font-bold text-[#0E0E0E] block">
                    Auto-Apply Rule
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Automatically include on eligible invoices generated during Billing Day.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

