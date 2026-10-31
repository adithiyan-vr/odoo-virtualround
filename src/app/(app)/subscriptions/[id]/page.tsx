'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  subscriptionApi,
  invoiceApi,
  billingApi,
  type Subscription,
  type SubscriptionStatus,
  type Invoice,
} from '@/lib/api-client';
import { StatusPill } from '@/components/shared/status-pill';
import { StatusRibbon } from '@/components/shared/status-ribbon';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatMoney, formatDate, formatDateTime } from '@/lib/format';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Calendar,
  Building,
  Mail,
  Repeat,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  FileText,
  FileCheck,
  Send,
} from 'lucide-react';

function SubscriptionDetailContent() {
  const params = useParams();
  const subId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [sub, setSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialogs
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await subscriptionApi.getSubscription(subId);
      setSub(data);

      const invRes = await invoiceApi.getInvoices({ q: data.subNumber });
      setInvoices(invRes.data || []);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [subId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleTransition = async (to: SubscriptionStatus) => {
    if (!sub) return;

    // Check plan policy rules if pausing
    if (to === 'PAUSED' && sub.plan && !sub.plan.canPause) {
      toast.error('Plan Policy Blocked', "This plan does not permit pausing subscriptions.");
      return;
    }

    // Check plan policy rules if closing early
    if (to === 'CLOSED' && sub.plan && !sub.plan.canCloseEarly) {
      toast.error('Plan Policy Blocked', "This plan does not permit early contract termination.");
      return;
    }

    setActionLoading(true);
    try {
      const updated = await subscriptionApi.transition(sub.id, to);
      setSub(updated);
      toast.success(
        'State Transition Completed',
        `${updated.subNumber} moved to ${to} status.`
      );
      fetchSubscription();
    } catch (err: unknown) {
      toast.error(
        'Transition Failed',
        err instanceof Error ? err.message : 'Invalid state transition.'
      );
    } finally {
      setActionLoading(false);
      setConfirmCloseOpen(false);
    }
  };

  const handleRenew = async () => {
    if (!sub) return;
    if (sub.plan && !sub.plan.canRenew) {
      toast.error('Plan Policy Blocked', 'This plan does not allow contract renewal.');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await subscriptionApi.renew(sub.id);
      setSub(updated);
      toast.success('Contract Renewed', `Expiry date extended to ${formatDate(updated.expiryDate)}.`);
      fetchSubscription();
    } catch (err: unknown) {
      toast.error('Renewal Failed', err instanceof Error ? err.message : 'Failed to renew');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoiceNow = async () => {
    if (!sub) return;
    setActionLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await billingApi.runBilling(todayStr, true);
      toast.billing(res.eligible, res.created, res.durationMs);
      fetchSubscription();
    } catch (err: unknown) {
      toast.error('Invoice Generation Failed', err instanceof Error ? err.message : 'Error generating invoice');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || !sub) {
    return (
      <div className="space-y-4 animate-pulse p-6">
        <div className="h-8 bg-[#F1F1EE] rounded-xl w-1/3" />
        <div className="h-64 bg-[#F1F1EE] rounded-2xl w-full" />
      </div>
    );
  }

  const isPaused = sub.status === 'PAUSED';

  return (
    <div className="space-y-6 text-left">
      {/* Top Breadcrumb & Status Ribbon Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E7E7E3]">
        <div className="flex items-center gap-3">
          <Link href="/subscriptions">
            <Button
              variant="secondary"
              size="sm"
              className="w-9 h-9 p-0 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="text-xs text-[#6B6B6B] flex items-center gap-1.5">
              <span>Subscriptions</span>
              <span>›</span>
              <span className="font-semibold text-[#0E0E0E]">{sub.subNumber}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
                {sub.subNumber}
              </h1>
              <StatusPill status={sub.status} />
            </div>
          </div>
        </div>

        {/* Status Ribbon: Draft › Quotation › Confirmed › Active › Closed */}
        <StatusRibbon
          type="subscription"
          currentStatus={sub.status}
          isPaused={isPaused}
        />
      </div>

      {/* Action Bar based on state machine */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#F7F7F5] rounded-2xl border border-[#E7E7E3]">
        <div className="text-xs text-[#6B6B6B]">
          Current state:{' '}
          <strong className="text-[#0E0E0E] uppercase">{sub.status}</strong>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sub.status === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleTransition('QUOTATION')}
              isLoading={actionLoading}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send Quotation
            </Button>
          )}

          {sub.status === 'QUOTATION' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTransition('DRAFT')}
                isLoading={actionLoading}
              >
                Back to Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTransition('CONFIRMED')}
                isLoading={actionLoading}
                className="gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Quotation
              </Button>
            </>
          )}

          {sub.status === 'CONFIRMED' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleTransition('ACTIVE')}
              isLoading={actionLoading}
              className="gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Activate Subscription
            </Button>
          )}

          {sub.status === 'ACTIVE' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTransition('PAUSED')}
                isLoading={actionLoading}
                className="gap-1.5 text-[#C2410C]"
              >
                <Pause className="w-3.5 h-3.5" /> Pause Billing
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleRenew}
                isLoading={actionLoading}
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Renew Contract
              </Button>

              <Button
                variant="accent"
                size="sm"
                onClick={handleGenerateInvoiceNow}
                isLoading={actionLoading}
                className="gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5" /> Generate Invoice Now
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmCloseOpen(true)}
                isLoading={actionLoading}
                className="gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Close Subscription
              </Button>
            </>
          )}

          {sub.status === 'PAUSED' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTransition('ACTIVE')}
                isLoading={actionLoading}
                className="gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Resume Subscription
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmCloseOpen(true)}
                isLoading={actionLoading}
                className="gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Close Subscription
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="lines">
        <TabsList>
          <TabsTrigger value="lines">Lines & Pricing</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity Audit</TabsTrigger>
        </TabsList>

        {/* Tab 1: Lines & Pricing */}
        <TabsContent value="lines" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contract Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-3 text-center">Qty</th>
                        <th className="py-3 px-3 text-right">Unit Price</th>
                        <th className="py-3 px-3 text-center">Tax %</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E3]">
                      {sub.lines.map((l, i) => (
                        <tr key={l.id || i} className="hover:bg-[#F7F7F5]/50">
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#0E0E0E] block">
                              {l.productName || 'Product'}
                            </span>
                            {l.variantName && (
                              <span className="text-[11px] text-[#C2410C]">
                                {l.variantName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center tabular-nums font-semibold text-[#0E0E0E]">
                            {l.quantity}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#0E0E0E]">
                            {formatMoney(l.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-center text-[#6B6B6B]">
                            {l.taxRate || 18}%
                          </td>
                          <td className="py-3 px-4 text-right font-bold tabular-nums text-[#0E0E0E]">
                            {formatMoney(l.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Sticky Totals Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Billing Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-[#6B6B6B]">
                  <div className="flex justify-between">
                    <span>Contract Subtotal:</span>
                    <span className="font-semibold text-[#0E0E0E] tabular-nums">
                      {formatMoney(sub.totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes (GST):</span>
                    <span className="font-semibold text-[#0E0E0E] tabular-nums">
                      {formatMoney(sub.totals.tax)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-[#0E0E0E] pt-2 border-t border-[#E7E7E3]">
                    <span>Total / Cycle:</span>
                    <span className="text-xl font-display text-[#FF6A1A] tabular-nums">
                      {formatMoney(sub.totals.total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0E0E0E]">
                  <Building className="w-4 h-4 text-[#FF6A1A]" />
                  <span>{sub.customer?.name}</span>
                </div>
                {sub.customer?.companyName && (
                  <p className="text-[#6B6B6B]">Company: {sub.customer.companyName}</p>
                )}
                {sub.customer?.email && (
                  <p className="text-[#6B6B6B] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#9A9A9A]" /> {sub.customer.email}
                  </p>
                )}
                {sub.customer?.gstin && (
                  <p className="text-[#6B6B6B] font-mono">GSTIN: {sub.customer.gstin}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contract Terms & Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-[#6B6B6B]">
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span className="font-semibold text-[#0E0E0E]">{formatDate(sub.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expiry Date:</span>
                  <span className="font-semibold text-[#0E0E0E]">{formatDate(sub.expiryDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Billing Cycle Date:</span>
                  <span className="font-semibold text-[#15803D]">
                    {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : 'Not scheduled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Terms:</span>
                  <span className="font-semibold text-[#0E0E0E]">{sub.paymentTerms || 'NET_30'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Invoices */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Invoices Issued ({invoices.length})</CardTitle>
              <Button
                variant="accent"
                size="sm"
                onClick={handleGenerateInvoiceNow}
                className="gap-1.5 text-xs"
              >
                <Play className="w-3 h-3 fill-current" /> Batch Bill Today
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#9A9A9A]">
                  No invoices issued yet. Click &quot;Batch Bill Today&quot; or run Billing Day.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-3">Billing Cycle</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E3]">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F7F7F5]/50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-bold text-[#0E0E0E] hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-[#6B6B6B]">
                          {formatDate(inv.billingCycleDate)}
                        </td>
                        <td className="py-3 px-3 text-[#6B6B6B]">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="py-3 px-3">
                          <StatusPill status={inv.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#0E0E0E]">
                          {formatMoney(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-[#DC2626]">
                          {formatMoney(inv.balanceDue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Activity */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 border-l border-[#E7E7E3] space-y-6 text-xs text-left">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-[#FF6A1A]" />
                  <span className="font-bold text-[#0E0E0E] block">
                    Current status: {sub.status}
                  </span>
                  <span className="text-[#6B6B6B]">State actively running in database</span>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-[#16A34A]" />
                  <span className="font-bold text-[#0E0E0E] block">
                    Contract Initialized
                  </span>
                  <span className="text-[#6B6B6B]">
                    Created with reference {sub.subNumber} on {formatDate(sub.startDate)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Close Dialog */}
      <ConfirmDialog
        isOpen={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={() => handleTransition('CLOSED')}
        title="Close Subscription Contract"
        consequence="This terminates recurring billing for this subscription. No further invoices will be generated."
        confirmLabel="Close Contract"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </div>
  );
}

export default function SubscriptionDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading subscription...</div>}>
      <SubscriptionDetailContent />
    </Suspense>
  );
}
