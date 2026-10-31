'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { invoiceApi, type Invoice } from '@/lib/api-client';
import { formatMoney, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

function PrintInvoiceContent() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading || !invoice) {
    return <div className="p-12 text-center text-sm font-sans">Loading invoice...</div>;
  }

  const isPaid = invoice.status === 'PAID';
  const isOverdue = invoice.isOverdue;

  return (
    <div className="min-h-screen bg-[#F7F7F5] print:bg-white text-[#0E0E0E] font-sans antialiased py-6 print:py-0">
      {/* Screen-only Print Bar */}
      <div className="max-w-4xl mx-auto px-6 mb-4 flex items-center justify-between print:hidden">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.back()}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button
          variant="primary"
          onClick={() => window.print()}
          className="gap-2"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* A4 Invoice Sheet Container */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 border border-[#E7E7E3] print:border-none shadow-sm print:shadow-none rounded-2xl print:rounded-none relative text-left">
        {/* Status Stamp if Paid or Overdue */}
        {isPaid && (
          <div className="absolute top-8 right-8 border-4 border-[#16A34A] text-[#16A34A] font-bold font-mono text-2xl uppercase tracking-widest px-6 py-2 rounded-xl rotate-12 opacity-80 pointer-events-none select-none">
            PAID
          </div>
        )}
        {isOverdue && !isPaid && (
          <div className="absolute top-8 right-8 border-4 border-[#DC2626] text-[#DC2626] font-bold font-mono text-2xl uppercase tracking-widest px-6 py-2 rounded-xl rotate-12 opacity-80 pointer-events-none select-none">
            OVERDUE
          </div>
        )}

        {/* Header: Company details + Invoice Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-[#D4D4D0]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF6A1A] flex items-center justify-center text-white font-bold text-sm">
                BL
              </div>
              <span className="text-xl font-bold font-display text-[#0E0E0E]">
                Brightloop Software Inc.
              </span>
            </div>
            <p className="text-xs text-[#4A4A4A] leading-relaxed">
              100 Tech Park Way, Koramangala<br />
              Bengaluru, Karnataka 560095<br />
              GSTIN: 29AAAAA0000A1Z5<br />
              billing@brightloop.io
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <h1 className="text-3xl font-bold font-mono tracking-tight text-[#0E0E0E]">
              TAX INVOICE
            </h1>
            <p className="text-sm font-bold font-mono text-[#0E0E0E]">
              {invoice.invoiceNumber}
            </p>
            <div className="text-xs text-[#4A4A4A] pt-2 space-y-0.5">
              <p>
                <strong>Invoice Date:</strong> {formatDate(invoice.billingCycleDate)}
              </p>
              <p>
                <strong>Due Date:</strong> {formatDate(invoice.dueDate)}
              </p>
              {invoice.subscription?.subNumber && (
                <p>
                  <strong>Subscription:</strong> {invoice.subscription.subNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="py-6 border-b border-[#D4D4D0] grid grid-cols-2 gap-6 text-xs">
          <div>
            <span className="font-bold text-[#6B6B6B] uppercase tracking-wider block mb-1">
              Billed To:
            </span>
            <p className="text-sm font-bold text-[#0E0E0E]">{invoice.customer?.name}</p>
            {invoice.customer?.companyName && (
              <p className="text-[#4A4A4A] font-semibold">{invoice.customer.companyName}</p>
            )}
            {invoice.customer?.billingAddress && (
              <p className="text-[#4A4A4A]">{invoice.customer.billingAddress}</p>
            )}
            {invoice.customer?.email && (
              <p className="text-[#4A4A4A]">{invoice.customer.email}</p>
            )}
            {invoice.customer?.gstin && (
              <p className="text-[#4A4A4A] font-mono mt-0.5">
                GSTIN: {invoice.customer.gstin}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="font-bold text-[#6B6B6B] uppercase tracking-wider block mb-1">
              Payment Terms:
            </span>
            <p className="text-[#0E0E0E] font-medium">Net 30 Days</p>
            <p className="text-[#4A4A4A] text-[11px] mt-1">
              Payable via RTGS/NEFT/UPI within the due period.
            </p>
          </div>
        </div>

        {/* Lines Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-[#0E0E0E] text-[#0E0E0E] font-bold">
                <th className="py-2.5 px-2">Description</th>
                <th className="py-2.5 px-2 text-center w-16">Qty</th>
                <th className="py-2.5 px-2 text-right w-24">Unit Rate</th>
                <th className="py-2.5 px-2 text-center w-20">Tax %</th>
                <th className="py-2.5 px-2 text-right w-28">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E3]">
              {invoice.lines.map((line, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-2 font-medium text-[#0E0E0E]">
                    {line.description}
                  </td>
                  <td className="py-3 px-2 text-center tabular-nums">{line.quantity}</td>
                  <td className="py-3 px-2 text-right tabular-nums">
                    {formatMoney(line.unitPrice)}
                  </td>
                  <td className="py-3 px-2 text-center text-[#4A4A4A]">
                    {line.taxRate}%
                  </td>
                  <td className="py-3 px-2 text-right font-bold tabular-nums text-[#0E0E0E]">
                    {formatMoney(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Block */}
        <div className="pt-4 border-t border-[#D4D4D0] flex justify-end">
          <div className="w-64 space-y-2 text-xs text-right">
            <div className="flex justify-between text-[#4A4A4A]">
              <span>Subtotal:</span>
              <span className="font-semibold tabular-nums text-[#0E0E0E]">
                {formatMoney(invoice.subtotal)}
              </span>
            </div>
            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-[#15803D]">
                <span>Discount:</span>
                <span className="font-semibold tabular-nums">
                  -{formatMoney(invoice.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#4A4A4A]">
              <span>Tax (GST):</span>
              <span className="font-semibold tabular-nums text-[#0E0E0E]">
                {formatMoney(invoice.taxAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-[#0E0E0E] pt-2 border-t border-[#0E0E0E]">
              <span>Invoice Total:</span>
              <span className="text-base tabular-nums">
                {formatMoney(invoice.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-[#15803D] pt-1">
              <span>Amount Paid:</span>
              <span className="font-bold tabular-nums">
                {formatMoney(invoice.paidAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center font-bold text-xs pt-1.5 border-t border-[#D4D4D0]">
              <span>BALANCE DUE:</span>
              <span
                className={`text-sm tabular-nums ${
                  Number(invoice.balanceDue) > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'
                }`}
              >
                {formatMoney(invoice.balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Bank Details & Terms Footer */}
        <div className="mt-12 pt-6 border-t border-[#D4D4D0] text-[11px] text-[#6B6B6B] flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <span className="font-bold text-[#0E0E0E] block mb-1">
              Bank Remittance Details:
            </span>
            <p>
              Account Name: Brightloop Software Solutions<br />
              Bank: HDFC Bank · Koramangala Branch<br />
              Account No: 50200012345678<br />
              IFSC Code: HDFC0001234
            </p>
          </div>
          <div className="sm:text-right max-w-xs">
            <span className="font-bold text-[#0E0E0E] block mb-1">Notice:</span>
            <p>
              Computer-generated document requiring no physical signature. Invoices past due date are subject to 1.5% monthly finance charges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrintInvoicePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm font-sans">Loading invoice...</div>}>
      <PrintInvoiceContent />
    </Suspense>
  );
}
