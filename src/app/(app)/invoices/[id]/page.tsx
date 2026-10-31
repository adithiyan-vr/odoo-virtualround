'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { invoiceApi, type Invoice } from '@/lib/api-client';
import { StatusPill } from '@/components/shared/status-pill';
import { StatusRibbon } from '@/components/shared/status-ribbon';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PaymentModal } from '@/features/payments/payment-modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatMoney, formatDate } from '@/lib/format';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Calendar,
  Building,
  Mail,
  Printer,
  CreditCard,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  FileText,
  Landmark,
} from 'lucide-react';

function InvoiceDetailContent() {
  const params = useParams();
  const invoiceId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoiceApi.getInvoice(invoiceId);
      setInvoice(data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleConfirm = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const updated = await invoiceApi.confirm(invoice.id);
      setInvoice(updated);
      toast.success('Invoice Confirmed', `${updated.invoiceNumber} is now issued and ready for collection.`);
      fetchInvoice();
    } catch (err: unknown) {
      toast.error('Action Failed', err instanceof Error ? err.message : 'Unable to confirm invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const updated = await invoiceApi.cancel(invoice.id);
      setInvoice(updated);
      toast.warning('Invoice Cancelled', `${updated.invoiceNumber} has been voided.`);
      fetchInvoice();
    } catch (err: unknown) {
      toast.error('Action Failed', err instanceof Error ? err.message : 'Unable to cancel invoice');
    } finally {
      setActionLoading(false);
      setConfirmCancelOpen(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await invoiceApi.send(invoice.id);
      toast.success(
        'Email Dispatched (Mocked)',
        `Invoice copy sent to ${invoice.customer?.email || 'customer'}. Check /dev/mailbox to view HTML.`
      );
    } catch (err: unknown) {
      toast.error('Send Failed', err instanceof Error ? err.message : 'Unable to dispatch email');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || !invoice) {
    return (
      <div className="space-y-4 animate-pulse p-6">
        <div className="h-8 bg-[#F1F1EE] rounded-xl w-1/3" />
        <div className="h-64 bg-[#F1F1EE] rounded-2xl w-full" />
      </div>
    );
  }

  const isConfirmed = invoice.status === 'CONFIRMED';
  const isDraft = invoice.status === 'DRAFT';
  const isPaid = invoice.status === 'PAID';
  const canPay = (isConfirmed || isPaid) && Number(invoice.balanceDue) > 0;
  const canCancel = (isDraft || isConfirmed) && (!invoice.payments || invoice.payments.length === 0);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E7E7E3]">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
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
              <span>Invoices</span>
              <span>›</span>
              <span className="font-semibold text-[#0E0E0E]">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
                {invoice.invoiceNumber}
              </h1>
              <StatusPill status={invoice.status} />
              {invoice.isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#B91C1C]">
                  <AlertCircle className="w-3.5 h-3.5" /> Overdue
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Ribbon: Draft › Confirmed › Paid (or Cancelled) */}
        <StatusRibbon
          type="invoice"
          currentStatus={invoice.status}
        />
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#F7F7F5] rounded-2xl border border-[#E7E7E3]">
        <div className="text-xs text-[#6B6B6B]">
          Billing cycle: <strong className="text-[#0E0E0E]">{formatDate(invoice.billingCycleDate)}</strong> · Due by: <strong className="text-[#0E0E0E]">{formatDate(invoice.dueDate)}</strong>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              isLoading={actionLoading}
              className="gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Invoice
            </Button>
          )}

          {canPay && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPaymentModalOpen(true)}
              className="gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" /> Record Payment
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSendEmail}
            isLoading={actionLoading}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Send to Customer
          </Button>

          <Link href={`/print/invoice/${invoice.id}`} target="_blank">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
          </Link>

          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmCancelOpen(true)}
              className="gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billed To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0E0E0E]">
              <Building className="w-4 h-4 text-[#FF6A1A]" />
              <span>{invoice.customer?.name}</span>
            </div>
            {invoice.customer?.companyName && (
              <p className="text-[#6B6B6B]">{invoice.customer.companyName}</p>
            )}
            {invoice.customer?.email && (
              <p className="text-[#6B6B6B] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#9A9A9A]" /> {invoice.customer.email}
              </p>
            )}
            {invoice.customer?.gstin && (
              <p className="text-[#6B6B6B] font-mono">GSTIN: {invoice.customer.gstin}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-[#6B6B6B]">
            {invoice.subscription ? (
              <div className="flex items-center justify-between">
                <span>Contract ID:</span>
                <Link
                  href={`/subscriptions/${invoice.subscriptionId}`}
                  className="font-bold text-[#FF6A1A] hover:underline"
                >
                  {invoice.subscription.subNumber}
                </Link>
              </div>
            ) : (
              <div>One-off custom invoice</div>
            )}
            <div className="flex justify-between">
              <span>Billing Cycle:</span>
              <span className="font-semibold text-[#0E0E0E]">{formatDate(invoice.billingCycleDate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Due Date:</span>
              <span className={`font-semibold ${invoice.isOverdue ? 'text-[#DC2626]' : 'text-[#0E0E0E]'}`}>
                {formatDate(invoice.dueDate)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lines & Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
                    <th className="py-3 px-4">Item Description</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Unit Price</th>
                    <th className="py-3 px-3 text-center">Tax %</th>
                    <th className="py-3 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E3]">
                  {invoice.lines.map((l, i) => (
                    <tr key={l.id || i} className="hover:bg-[#F7F7F5]/50">
                      <td className="py-3 px-4 font-bold text-[#0E0E0E]">
                        {l.description}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums font-semibold text-[#0E0E0E]">
                        {l.quantity}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#0E0E0E]">
                        {formatMoney(l.unitPrice)}
                      </td>
                      <td className="py-3 px-3 text-center text-[#6B6B6B]">
                        {l.taxRate}%
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-[#0E0E0E]">
                        {formatMoney(l.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Totals Block */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-[#6B6B6B]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-[#0E0E0E] tabular-nums">
                  {formatMoney(invoice.subtotal)}
                </span>
              </div>
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-[#15803D]">
                  <span>Discount Applied:</span>
                  <span className="font-semibold tabular-nums">
                    -{formatMoney(invoice.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax Amount:</span>
                <span className="font-semibold text-[#0E0E0E] tabular-nums">
                  {formatMoney(invoice.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-[#0E0E0E] pt-2 border-t border-[#E7E7E3]">
                <span>Total Amount:</span>
                <span className="text-xl font-display text-[#0E0E0E] tabular-nums">
                  {formatMoney(invoice.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-[#15803D]">
                <span>Paid to Date:</span>
                <span className="font-bold tabular-nums">
                  {formatMoney(invoice.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E7E7E3] font-bold">
                <span className="text-xs uppercase text-[#6B6B6B]">Balance Due:</span>
                <span
                  className={`text-lg tabular-nums ${
                    Number(invoice.balanceDue) > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'
                  }`}
                >
                  {formatMoney(invoice.balanceDue)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment History Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#FF6A1A]" />
            <span>Payments & Collections ({invoice.payments?.length || 0})</span>
          </CardTitle>
          {canPay && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPaymentModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <CreditCard className="w-3.5 h-3.5" /> Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!invoice.payments || invoice.payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9A9A9A]">
              No payments recorded yet. Click &quot;Record Payment&quot; when funds are received.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Reference / UTR</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E3]">
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F7F7F5]/50">
                    <td className="py-3 px-4 font-medium text-[#0E0E0E]">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#4A4A4A]">
                      {p.reference || '—'}
                    </td>
                    <td className="py-3 px-3 text-[#6B6B6B]">{p.note || '—'}</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums text-[#15803D]">
                      {formatMoney(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoice={invoice}
        onSuccess={() => fetchInvoice()}
      />

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Invoice"
        consequence={`This will permanently cancel and void ${invoice.invoiceNumber}. This action cannot be undone.`}
        confirmLabel="Cancel Invoice"
        isDestructive={true}
        isLoading={actionLoading}
      />
    </div>
  );
}

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading invoice...</div>}>
      <InvoiceDetailContent />
    </Suspense>
  );
}
