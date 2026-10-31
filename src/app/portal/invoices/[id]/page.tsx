'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { portalApi } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/shared/status-pill';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { formatMoney, formatDate } from '@/lib/format';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  QrCode,
  Landmark,
  Banknote,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
} from 'lucide-react';

function CustomerInvoiceDetailContent() {
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'UPI' | 'CARD' | 'BANK_TRANSFER'>('UPI');
  const [payReference, setPayReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payError, setPayError] = useState('');

  async function loadInvoice() {
    setIsLoading(true);
    try {
      const data = await portalApi.getInvoiceDetail(id);
      setInvoice(data);
      if (data) {
        setPayAmount(Number(data.amountDue || data.balanceDue || 0));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invoice not found or access denied');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadInvoice();
  }, [id]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');

    if (payAmount <= 0) {
      setPayError('Payment amount must be greater than zero.');
      return;
    }

    const maxDue = Number(invoice.amountDue || invoice.balanceDue || 0);
    if (payAmount > maxDue) {
      setPayError(`Payment cannot exceed the balance due of ${formatMoney(maxDue)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await portalApi.payInvoice(id, {
        amount: payAmount,
        method: payMethod,
        reference: payReference || `TXN-${Date.now().toString().slice(-6)}`,
        note: `Self-service portal settlement via ${payMethod}`,
      });

      toast.success(
        'Payment Successful',
        `Settled ${formatMoney(payAmount)} via ${payMethod}. Thank you!`
      );
      setPayModalOpen(false);
      await loadInvoice();
    } catch (err: any) {
      setPayError(err.message || 'Failed to process payment');
      toast.error('Payment Error', err.message || 'Could not complete transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-[#6B6B6B] text-sm font-semibold">
        Loading invoice statement...
      </div>
    );
  }

  if (errorMsg || !invoice) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-[#DC2626] mx-auto" />
        <h2 className="text-xl font-bold text-[#0E0E0E]">Unable to view invoice</h2>
        <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">{errorMsg}</p>
        <Link href="/portal/invoices">
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to My Invoices
          </Button>
        </Link>
      </div>
    );
  }

  const balanceDue = Number(invoice.amountDue ?? invoice.balanceDue ?? 0);
  const isPaid = invoice.status === 'PAID' || balanceDue === 0;

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/portal/invoices"
            className="inline-flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#0E0E0E] mb-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#0E0E0E] tracking-tight">
              {invoice.invoiceNumber}
            </h1>
            <StatusPill status={invoice.status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/print/invoice/${invoice.id}`} target="_blank">
            <Button variant="secondary" className="gap-1.5 text-xs">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
          </Link>

          {!isPaid && invoice.status === 'CONFIRMED' && (
            <Button
              variant="accent"
              onClick={() => {
                setPayAmount(balanceDue);
                setPayModalOpen(true);
              }}
              className="gap-1.5 text-xs shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" /> Pay Now ({formatMoney(balanceDue)})
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Details Card */}
      <Card className="overflow-hidden">
        <div className="p-6 bg-[#0E0E0E] text-white flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#FFC83D] font-bold block mb-1">
              Tax Invoice & Receipt
            </span>
            <span className="text-2xl font-bold font-display">{invoice.invoiceNumber}</span>
            <span className="text-xs text-[#A3A3A3] block mt-1">
              Billed To: <strong className="text-white">{invoice.billToName || invoice.customer?.name}</strong> ({invoice.billToEmail || invoice.customer?.email})
            </span>
            {invoice.billToGstin && (
              <span className="text-xs text-[#A3A3A3] block">
                GSTIN: <span className="font-mono text-white">{invoice.billToGstin}</span>
              </span>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1 text-xs">
            <div>
              <span className="text-[#A3A3A3]">Invoice Date: </span>
              <span className="font-mono font-bold text-white">{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div>
              <span className="text-[#A3A3A3]">Due Date: </span>
              <span className="font-mono font-bold text-white">{formatDate(invoice.dueDate)}</span>
            </div>
            <div>
              <span className="text-[#A3A3A3]">Payment Terms: </span>
              <span className="text-white font-semibold">{invoice.paymentTermName || 'Net 30'}</span>
            </div>
          </div>
        </div>

        {/* Lines Breakdown */}
        <div className="p-6">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E7E7E3] pb-2 text-[#6B6B6B] font-bold">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Tax Rate</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E3]">
              {(invoice.lines || []).map((l: any) => (
                <tr key={l.id} className="py-3">
                  <td className="py-3 font-semibold text-[#0E0E0E]">{l.description}</td>
                  <td className="py-3 text-right tabular-nums text-[#4A4A4A]">{l.quantity}</td>
                  <td className="py-3 text-right tabular-nums text-[#4A4A4A]">{formatMoney(l.unitPrice)}</td>
                  <td className="py-3 text-right tabular-nums text-[#6B6B6B]">
                    {l.taxName ? `${l.taxName} (${l.taxRate}%)` : `${l.taxRate || 0}%`}
                  </td>
                  <td className="py-3 text-right tabular-nums font-bold text-[#0E0E0E]">
                    {formatMoney(l.lineTotal || l.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotals & Balances Calculation */}
          <div className="mt-6 border-t border-[#E7E7E3] pt-4 flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Subtotal (Ex-Tax)</span>
                <span className="tabular-nums font-semibold text-[#0E0E0E]">{formatMoney(invoice.subtotal)}</span>
              </div>
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-[#15803D]">
                  <span>Applied Discounts</span>
                  <span className="tabular-nums font-semibold">-{formatMoney(invoice.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Tax (GST)</span>
                <span className="tabular-nums font-semibold text-[#0E0E0E]">{formatMoney(invoice.taxAmount)}</span>
              </div>
              <div className="border-t border-[#E7E7E3] pt-2 flex justify-between text-sm font-bold text-[#0E0E0E]">
                <span>Total Amount</span>
                <span className="tabular-nums font-display">{formatMoney(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#15803D]">
                <span>Amount Paid</span>
                <span className="tabular-nums font-semibold">{formatMoney(invoice.amountPaid)}</span>
              </div>
              <div className="border-t border-[#0E0E0E] pt-2 flex justify-between text-base font-bold">
                <span className={balanceDue > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'}>Balance Due</span>
                <span className={`tabular-nums font-display ${balanceDue > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'}`}>
                  {formatMoney(balanceDue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#FF6A1A]" />
            <span>Payments Recorded Against this Invoice</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F7F7F5] border-b border-[#E7E7E3] text-[#6B6B6B] font-bold">
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Reference / UTR</th>
                <th className="py-2.5 px-4 text-right">Settled Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E3]">
              {(invoice.payments || []).map((p: any) => (
                <tr key={p.id}>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                      {p.method}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#6B6B6B]">{formatDate(p.paymentDate)}</td>
                  <td className="py-2.5 px-3 font-mono text-[#4A4A4A]">{p.reference || '—'}</td>
                  <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[#15803D]">
                    {formatMoney(p.amount)}
                  </td>
                </tr>
              ))}
              {(!invoice.payments || invoice.payments.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#6B6B6B]">
                    No payments recorded for this invoice yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Self-Service Mock Pay Modal */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Settle Invoice Online"
        description={`Secure simulated payment towards ${invoice.invoiceNumber}.`}
      >
        <form onSubmit={handlePayment} className="space-y-4 text-left">
          {payError && (
            <div className="p-3 text-xs bg-[#FEE2E2] text-[#B91C1C] rounded-xl font-semibold">
              {payError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0E0E0E] mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'UPI', label: 'UPI / QR', icon: QrCode },
                { key: 'CARD', label: 'Credit Card', icon: CreditCard },
                { key: 'BANK_TRANSFER', label: 'Net Banking', icon: Landmark },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = payMethod === m.key;
                return (
                  <button
                    type="button"
                    key={m.key}
                    onClick={() => setPayMethod(m.key as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-1.5 transition-all ${
                      isSelected
                        ? 'border-[#0E0E0E] bg-[#0E0E0E] text-white shadow-xs'
                        : 'border-[#E7E7E3] bg-white text-[#4A4A4A] hover:bg-[#F7F7F5]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0E0E0E] mb-1">
              Payment Amount (₹)
            </label>
            <Input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
              required
            />
            <span className="text-[11px] text-[#6B6B6B] mt-1 block">
              Max balance due: <strong>{formatMoney(balanceDue)}</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0E0E0E] mb-1">
              Reference / UTR / Order ID (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. UPI-998242"
              value={payReference}
              onChange={(e) => setPayReference(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : `Confirm & Pay ${formatMoney(payAmount)}`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function CustomerInvoiceDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm font-semibold text-[#6B6B6B]">Loading invoice...</div>}>
      <CustomerInvoiceDetailContent />
    </Suspense>
  );
}
