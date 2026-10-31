'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { portalApi } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/shared/status-pill';
import { StatusRibbon } from '@/components/shared/status-ribbon';
import { PolicyChips } from '@/components/shared/policy-chips';
import { formatMoney, formatDate } from '@/lib/format';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Repeat,
  Pause,
  Play,
  XCircle,
  FileText,
  Calendar,
  Layers,
  AlertCircle,
} from 'lucide-react';

function CustomerSubscriptionDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [sub, setSub] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await portalApi.getSubscriptionDetail(id);
      setSub(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Subscription not found or access denied');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleAction = async (action: 'PAUSE' | 'RESUME' | 'CLOSE') => {
    setActionLoading(true);
    try {
      await portalApi.requestSubscriptionAction(id, action);
      toast.success(
        'Subscription Updated',
        `Action ${action} executed successfully on ${sub.subNumber}.`
      );
      await loadData();
    } catch (err: any) {
      toast.error('Action Failed', err.message || `Unable to ${action} subscription.`);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-[#6B6B6B] text-sm font-semibold">
        Loading subscription details...
      </div>
    );
  }

  if (errorMsg || !sub) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-[#DC2626] mx-auto" />
        <h2 className="text-xl font-bold text-[#0E0E0E]">Unable to load subscription</h2>
        <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">{errorMsg}</p>
        <Link href="/portal/subscriptions">
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to My Subscriptions
          </Button>
        </Link>
      </div>
    );
  }

  const plan = sub.plan;
  const canPause = plan?.canPause;
  const canCloseEarly = plan?.canCloseEarly;

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/portal/subscriptions"
            className="inline-flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#0E0E0E] mb-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Subscriptions
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#0E0E0E] tracking-tight">
              {sub.subNumber}
            </h1>
            <StatusPill status={sub.status} />
          </div>
        </div>

        {/* Self-Service Plan Action Buttons */}
        <div className="flex items-center gap-2">
          {sub.status === 'ACTIVE' && (
            <>
              <Button
                variant="secondary"
                disabled={!canPause || actionLoading}
                onClick={() => handleAction('PAUSE')}
                className="gap-2 text-xs"
                title={canPause ? 'Temporarily pause subscription billing' : 'Plan policy does not permit pausing'}
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Subscription</span>
              </Button>

              <Button
                variant="destructive"
                disabled={!canCloseEarly || actionLoading}
                onClick={() => handleAction('CLOSE')}
                className="gap-2 text-xs"
                title={canCloseEarly ? 'Cancel contract' : 'Plan policy does not permit early closure'}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Contract</span>
              </Button>
            </>
          )}

          {sub.status === 'PAUSED' && (
            <Button
              variant="accent"
              disabled={actionLoading}
              onClick={() => handleAction('RESUME')}
              className="gap-2 text-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Subscription</span>
            </Button>
          )}
        </div>
      </div>

      {/* Visual Status Ribbon */}
      <Card className="p-4">
        <StatusRibbon currentStatus={sub.status} isPaused={sub.status === 'PAUSED'} />
      </Card>

      {/* Plan Details & Contract Terms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF6A1A]" />
              <span>Subscription & Plan Parameters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
              <div>
                <span className="text-[#6B6B6B] block">Plan Model</span>
                <span className="font-bold text-[#0E0E0E] text-sm mt-0.5 block">
                  {plan.name}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block">Billing Cycle</span>
                <span className="font-bold text-[#0E0E0E] uppercase text-sm mt-0.5 block">
                  {plan.billingInterval}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block">Payment Terms</span>
                <span className="font-bold text-[#0E0E0E] text-sm mt-0.5 block">
                  {sub.paymentTerm}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block">Contract Start</span>
                <span className="font-mono text-[#0E0E0E] text-sm mt-0.5 block">
                  {formatDate(sub.startDate)}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block">Contract End</span>
                <span className="font-mono text-[#0E0E0E] text-sm mt-0.5 block">
                  {formatDate(sub.expiryDate)}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block">Next Billing Cycle</span>
                <span className="font-mono text-[#FF6A1A] font-bold text-sm mt-0.5 block">
                  {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : 'Completed'}
                </span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-[#0E0E0E] block mb-2">
                Plan Policy Permissions:
              </span>
              <PolicyChips
                autoClose={false}
                canCloseEarly={plan.canCloseEarly}
                canPause={plan.canPause}
                canRenew={plan.canRenew}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#15803D]" />
              <span>Cycle Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-center">
              <span className="text-xs text-[#166534] block">Recurring Subtotal</span>
              <span className="text-3xl font-bold font-display text-[#15803D] tabular-nums mt-1 block">
                {formatMoney(sub.recurringSubtotal)}
              </span>
              <span className="text-[10px] text-[#166534] mt-0.5 block">
                Auto-billed each {plan.billingInterval?.toLowerCase()} cycle
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Lines Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Subscribed Items & Features</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
                <th className="py-2.5 px-4">Item & Variant</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Unit Rate</th>
                <th className="py-2.5 px-4 text-right">Cycle Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E3]">
              {sub.lines.map((l: any) => (
                <tr key={l.id} className="hover:bg-[#F7F7F5]/50">
                  <td className="py-3 px-4">
                    <span className="font-bold text-[#0E0E0E] block">
                      {l.description}
                    </span>
                    {l.variant && (
                      <span className="text-[11px] text-[#FF6A1A] font-semibold">
                        {l.variant.attributeName}: {l.variant.attributeValue} (+{formatMoney(l.variant.priceSurcharge)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-[#0E0E0E]">
                    {l.quantity}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-[#4A4A4A]">
                    {formatMoney(l.unitPrice)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-[#0E0E0E]">
                    {formatMoney(l.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Linked Invoices Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FF6A1A]" />
            <span>Invoices Generated for this Contract</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E3]">
              {sub.invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-[#F7F7F5]/50">
                  <td className="py-2.5 px-4">
                    <Link
                      href={`/portal/invoices/${inv.id}`}
                      className="font-bold text-[#0E0E0E] hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-[#6B6B6B]">{formatDate(inv.invoiceDate)}</td>
                  <td className="py-2.5 px-3 text-[#6B6B6B]">{formatDate(inv.dueDate)}</td>
                  <td className="py-2.5 px-3">
                    <StatusPill status={inv.status} />
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#0E0E0E]">
                    {formatMoney(inv.totalAmount)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Link
                      href={`/portal/invoices/${inv.id}`}
                      className="text-xs font-semibold text-[#FF6A1A] hover:underline"
                    >
                      View Invoice
                    </Link>
                  </td>
                </tr>
              ))}
              {sub.invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#6B6B6B]">
                    No invoices generated yet. Invoices appear following Billing Day runs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerSubscriptionDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm font-semibold text-[#6B6B6B]">Loading subscription...</div>}>
      <CustomerSubscriptionDetailContent />
    </Suspense>
  );
}
