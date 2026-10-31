'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  catalogApi,
  type QuotationTemplate,
  type Plan,
  type Product,
  type TaxRule,
} from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineEditor, type EditableLine } from '@/components/shared/line-editor';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, Save } from 'lucide-react';

export function TemplateForm({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(templateId);

  const [name, setName] = useState('');
  const [planId, setPlanId] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [lines, setLines] = useState<EditableLine[]>([]);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [planRes, prodRes, taxRes] = await Promise.all([
          catalogApi.getPlans(),
          catalogApi.getProducts({ pageSize: 100 }),
          catalogApi.getTaxes(),
        ]);
        setPlans(planRes.data || []);
        setProducts(prodRes.data || []);
        setTaxes(taxRes || []);

        if (planRes.data && planRes.data.length > 0 && !planId) {
          setPlanId(planRes.data[0].id);
        }

        if (templateId) {
          const t = await catalogApi.getTemplate(templateId);
          if (t) {
            setName(t.name);
            setPlanId(t.planId);
            setValidityDays(t.validityDays);
            const mappedLines: EditableLine[] = (t.lines || []).map((l) => ({
              productId: l.productId,
              productName: l.product?.name,
              variantId: l.variantId,
              variantName: l.variant
                ? `${l.variant.attributeName}: ${l.variant.attributeValue}`
                : undefined,
              quantity: l.quantity,
              unitPrice: Number(l.product?.salesPrice || 0) + Number(l.variant?.priceSurcharge || 0),
              taxRate: 18,
            }));
            setLines(mappedLines);
          }
        }
      } catch {
        // Fallback
      }
    }
    loadData();
  }, [templateId, planId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error('Validation Error', 'Please add at least one product line to the template.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Partial<QuotationTemplate> = {
        name,
        planId,
        validityDays,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || null,
          quantity: l.quantity,
        })),
      };

      if (isEdit && templateId) {
        await catalogApi.updateTemplate(templateId, payload);
      } else {
        await catalogApi.createTemplate(payload);
      }

      toast.success(
        isEdit ? 'Template Updated' : 'Template Created',
        `${name} template saved successfully.`
      );
      router.push('/templates');
    } catch (err: unknown) {
      toast.error('Save Failed', err instanceof Error ? err.message : 'Unable to save template');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/templates">
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
              {isEdit ? `Edit ${name || 'Template'}` : 'New Quotation Template'}
            </h1>
            <p className="text-xs text-[#6B6B6B]">
              Configure default plan bundle and pre-filled lines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/templates">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
            <Save className="w-4 h-4" /> Save Template
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bundle Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Template Name"
                required
                placeholder="e.g. Enterprise Cloud Starter Pack"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Select
                label="Default Billing Plan"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.billingInterval})
                  </option>
                ))}
              </Select>

              <Input
                label="Quotation Validity (Days)"
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                helperText="Sets expiration window from quotation generation date."
              />
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Bundle Product Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <LineEditor
              lines={lines}
              products={products}
              taxes={taxes}
              onChange={setLines}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

