'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { paymentApi, invoiceApi, type Payment } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { formatMoney, formatDate } from '@/lib/format';
import { CreditCard, Landmark, QrCode, Banknote, FileCheck } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      setIsLoading(true);
      try {
        // Try calling the dedicated payments endpoint
        const res = await paymentApi.getPayments({ pageSize: 50 });
        if (res && res.payments && res.payments.length > 0) {
          setPayments(res.payments as any);
          return;
        }

        // Fallback: collect payments from invoices
        const invRes = await invoiceApi.getInvoices();
        const allPayments: Payment[] = [];
        for (const inv of invRes.data || []) {
          for (const p of inv.payments || []) {
            allPayments.push({ ...p, invoiceNumber: inv.invoiceNumber });
          }
        }
        setPayments(allPayments);
      } catch {
        setPayments([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadPayments();
  }, []);

  const columns: Column<Payment>[] = [
    {
      key: 'method',
      header: 'Payment Method',
      render: (p) => {
        const icons: Record<string, React.ReactNode> = {
          UPI: <QrCode className="w-3.5 h-3.5" />,
          BANK: <Landmark className="w-3.5 h-3.5" />,
          BANK_TRANSFER: <Landmark className="w-3.5 h-3.5" />,
          CARD: <CreditCard className="w-3.5 h-3.5" />,
          CASH: <Banknote className="w-3.5 h-3.5" />,
          CHEQUE: <FileCheck className="w-3.5 h-3.5" />,
        };

        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D]">
            {icons[p.method] || <CreditCard className="w-3.5 h-3.5" />}
            {p.method}
          </span>
        );
      },
    },
    {
      key: 'invoice',
      header: 'Invoice #',
      render: (p) => (
        <Link
          href={`/invoices/${p.invoiceId}`}
          className="font-bold font-mono text-xs text-[#0E0E0E] hover:underline"
        >
          {p.invoiceNumber || 'INV-2026-000101'}
        </Link>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Payment Date',
      render: (p) => (
        <span className="text-xs text-[#6B6B6B]">
          {formatDate(p.paymentDate)}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference / UTR',
      render: (p) => (
        <span className="font-mono text-xs text-[#4A4A4A]">
          {p.reference || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount Collected',
      align: 'right',
      render: (p) => (
        <span className="font-bold tabular-nums text-sm text-[#15803D]">
          {formatMoney(p.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusPill status={p.status || 'RECORDED'} />,
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
          Payments & Collections Ledger
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Audit trail of payments recorded against customer receivables.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        emptyTitle="No payments recorded"
        emptyDescription="Payments recorded against confirmed invoices will appear here."
      />
    </div>
  );
}
