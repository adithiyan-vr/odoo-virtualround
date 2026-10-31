'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  subscriptionApi,
  catalogApi,
  customerApi,
  type Customer,
  type Plan,
  type Product,
  type TaxRule,
  type QuotationTemplate,
  type PaymentTerm,
} from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineEditor, type EditableLine } from '@/components/shared/line-editor';
import { formatMoney } from '@/lib/format';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';

export default function NewSubscriptionPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  // Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [expiryDate, setExpiryDate] = useState('2027-10-31');

  useEffect(() => {
    try {
      const today = new Date();
      setStartDate(today.toISOString().split('T')[0]);
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpiryDate(nextYear.toISOString().split('T')[0]);
    } catch {
      // Fallback
    }
  }, []);

  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState('NET_30');
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [custRes, planRes, prodRes, taxRes, tplRes, termRes] = await Promise.all([
          customerApi.getCustomers(),
          catalogApi.getPlans({ pageSize: 100 }),
          catalogApi.getProducts({ pageSize: 100 }),
          catalogApi.getTaxes(),
          catalogApi.getTemplates(),
          catalogApi.getPaymentTerms(),
        ]);

        setCustomers(custRes);
        setPlans(planRes.data || []);
        setProducts(prodRes.data || []);
        setTaxes(taxRes);
        setTemplates(tplRes);
        setPaymentTerms(termRes);

        if (custRes.length > 0) setSelectedCustomerId(custRes[0].id);
        if (planRes.data && planRes.data.length > 0) setSelectedPlanId(planRes.data[0].id);
      } catch {
        // Fallback
      }
    }
    loadData();
  }, []);

  // When a quotation template is chosen, pre-fill Plan and Lines!
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    if (tpl.planId) {
      setSelectedPlanId(tpl.planId);
    }

    if (tpl.validityDays) {
      const exp = new Date(startDate);
      exp.setDate(exp.getDate() + tpl.validityDays);
      setExpiryDate(exp.toISOString().split('T')[0]);
    }

    // Pre-fill lines
    const newLines: EditableLine[] = tpl.lines.map((l) => {
      const prod = products.find((p) => p.id === l.productId);
      const variant = prod?.variants?.find((v) => v.id === l.variantId);
      const surcharge = variant ? Number(variant.priceSurcharge) : 0;
      const base = prod ? Number(prod.salesPrice) : 0;

      return {
        productId: l.productId,
        productName: prod?.name || 'Product',
        variantId: l.variantId || null,
        variantName: variant ? `${variant.attributeName}: ${variant.attributeValue}` : null,
        quantity: l.quantity,
        unitPrice: base + surcharge,
        taxRate: 18,
      };
    });

    setLines(newLines);
    toast.info('Template Applied', `Loaded plan and ${newLines.length} product lines from template.`);
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const planFee = Number(selectedPlan?.price) || 0;

  // Total calculations
  const productSubtotal = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const subtotal = productSubtotal + planFee;
  const totalTax = lines.reduce(
    (acc, l) => acc + (l.quantity * l.unitPrice * (l.taxRate || 18)) / 100,
    planFee * 0.18
  );
  const totalAmount = subtotal + totalTax;

  const totalQuantity = lines.reduce((acc, l) => acc + l.quantity, 0);
  const meetsMinQty = !selectedPlan || totalQuantity >= selectedPlan.minQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length === 0) {
      toast.error('Validation Error', 'Please add at least one line item.');
      return;
    }

    if (selectedPlan && totalQuantity < selectedPlan.minQty) {
      toast.error(
        'Policy Violation',
        `This plan requires a minimum quantity of ${selectedPlan.minQty} units. Currently selected: ${totalQuantity}.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      const subLines: EditableLine[] = [...lines];

      // If plan has a recurring fee > 0, include plan fee line
      if (planFee > 0) {
        subLines.unshift({
          productId: 'plan-fee',
          productName: `Plan fee (${selectedPlan?.name || 'Subscription'})`,
          quantity: 1,
          unitPrice: planFee,
          taxRate: 18,
          isPlanFee: true,
        });
      }

      const newSub = await subscriptionApi.createSubscription({
        customerId: selectedCustomerId,
        customer: cust,
        planId: selectedPlanId,
        plan: selectedPlan,
        startDate,
        expiryDate,
        paymentTerms: selectedPaymentTerm,
        lines: subLines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          variantId: l.variantId,
          variantName: l.variantName,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate || 18,
          subtotal: l.quantity * l.unitPrice,
          isPlanFee: l.isPlanFee,
        })),
        totals: {
          subtotal,
          tax: totalTax,
          total: totalAmount,
        },
      });

      toast.success(
        'Subscription Created',
        `${newSub.subNumber} created in Draft status. You can now send or confirm the quotation.`
      );
      router.push(`/subscriptions/${newSub.id}`);
    } catch (err: unknown) {
      toast.error('Creation Failed', err instanceof Error ? err.message : 'Unable to create subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/subscriptions">
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
              New Subscription / Quotation
            </h1>
            <p className="text-xs text-[#6B6B6B]">
              Build from a pre-configured template or configure custom plan lines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/subscriptions">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="gap-2"
          >
            Create Subscription <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Contract Setup & Lines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Template Picker */}
          {templates.length > 0 && (
            <Card className="bg-[#FFF4EC] border-[#FFE6D2]">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C2410C]">
                  <Sparkles className="w-4 h-4" />
                  <span>Start from a Quotation Template:</span>
                </div>
                <div className="w-full sm:w-auto">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="h-9 px-3 bg-white border border-[#E7E7E3] rounded-full text-xs font-semibold text-[#0E0E0E] cursor-pointer"
                  >
                    <option value="">Choose a Template (Optional)...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.validityDays}d)
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer & Plan Card */}
          <Card>
            <CardHeader>
              <CardTitle>Customer & Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Customer / Client"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''} — {c.email}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Billing Plan"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.billingInterval} · {formatMoney(p.price)}/mo)
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="Contract Expiry Date"
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
                <Select
                  label="Payment Terms"
                  value={selectedPaymentTerm}
                  onChange={(e) => setSelectedPaymentTerm(e.target.value)}
                >
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_15">Net 15 Days</option>
                  <option value="IMMEDIATE">Immediate Due</option>
                  <option value="NET_60">Net 60 Days</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Product Lines Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quotation Line Items</CardTitle>
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

        {/* Right 1 Col: Live Contract Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Period Totals Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Fee notice if applicable */}
              {planFee > 0 && (
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
                  <span className="text-[#6B6B6B]">Plan Recurring Fee:</span>
                  <span className="font-bold tabular-nums text-[#0E0E0E]">
                    {formatMoney(planFee)}
                  </span>
                </div>
              )}

              <div className="space-y-2 text-xs text-[#6B6B6B] border-t border-[#E7E7E3] pt-3">
                <div className="flex justify-between">
                  <span>Product Lines ({lines.length}):</span>
                  <span className="font-semibold text-[#0E0E0E] tabular-nums">
                    {formatMoney(productSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable Subtotal:</span>
                  <span className="font-semibold text-[#0E0E0E] tabular-nums">
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (GST):</span>
                  <span className="font-semibold text-[#0E0E0E] tabular-nums">
                    {formatMoney(totalTax)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-[#0E0E0E] pt-2 border-t border-[#E7E7E3]">
                  <span>Total / Period:</span>
                  <span className="text-xl font-display text-[#FF6A1A] tabular-nums">
                    {formatMoney(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Policy minimum quantity check warning */}
              {selectedPlan && !meetsMinQty && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#B91C1C]">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Minimum quantity requirement not met ({totalQuantity}/{selectedPlan.minQty}).
                  </span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full gap-2"
                isLoading={isLoading}
              >
                Create Quotation Draft <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
