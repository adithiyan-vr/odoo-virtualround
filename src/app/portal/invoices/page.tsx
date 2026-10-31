'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { portalApi } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@/lib/format';
import { FileText, ArrowRight, CreditCard, Printer, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/export';

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PAID'>('ALL');

  useEffect(() => {
    async function loadInvoices() {
      setIsLoading(true);
      try {
        const filterParam = statusFilter === 'ALL' ? undefined : statusFilter;
        const res = await portalApi.getInvoices({ status: filterParam, pageSize: 50 });
        setInvoices(res?.invoices || []);
      } catch {
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadInvoices();
  }, [statusFilter]);

  const columns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (inv) => (
        <div>
          <Link
            href={`/portal/invoices/${inv.id}`}
            className="font-bold font-mono text-sm text-[#0E0E0E] hover:underline hover:text-[#FF6A1A] transition-colors"
          >
            {inv.invoiceNumber}
          </Link>
          {inv.subscription && (
            <span className="block text-[11px] text-[#6B6B6B]">
              Ref: {inv.subscription.subNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'Invoice Date',
      render: (inv) => (
        <span className="text-xs text-[#6B6B6B]">
          {formatDate(inv.invoiceDate)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (inv) => (
        <div>
          <span className="text-xs text-[#6B6B6B] block">
            {formatDate(inv.dueDate)}
          </span>
          {inv.isOverdue && (
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#B91C1C]">
              Overdue
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => <StatusPill status={inv.status} />,
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      align: 'right',
      render: (inv) => (
        <span className="font-bold tabular-nums text-sm text-[#0E0E0E]">
          {formatMoney(inv.totalAmount)}
        </span>
      ),
    },
    {
      key: 'amountDue',
      header: 'Balance Due',
      align: 'right',
      render: (inv) => (
        <span
          className={`font-bold tabular-nums text-sm ${
            Number(inv.amountDue) > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'
          }`}
        >
          {formatMoney(inv.amountDue)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-2">
          {Number(inv.amountDue) > 0 && inv.status === 'CONFIRMED' ? (
            <Link href={`/portal/invoices/${inv.id}`}>
              <Button variant="accent" size="sm" className="h-7 px-3 text-xs gap-1">
                <CreditCard className="w-3 h-3" /> Pay Now
              </Button>
            </Link>
          ) : (
            <Link href={`/portal/invoices/${inv.id}`}>
              <Button variant="secondary" size="sm" className="h-7 px-3 text-xs gap-1">
                View
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  const handleExportCsv = () => {
    const headers = ['Invoice #', 'Invoice Date', 'Due Date', 'Status', 'Total (INR)', 'Paid (INR)', 'Balance Due (INR)'];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      formatDate(inv.invoiceDate),
      formatDate(inv.dueDate),
      inv.status,
      inv.totalAmount,
      inv.paidAmount,
      inv.amountDue,
    ]);
    downloadCsv(`my-invoices-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
            My Invoices & Receipts
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            View billing history, itemized tax charges, and settle pending balances.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={invoices.length === 0}
            className="gap-1.5 text-xs h-8"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>

          <div className="inline-flex rounded-xl bg-white border border-[#E7E7E3] p-1 text-xs shadow-xs">
          {(['ALL', 'CONFIRMED', 'PAID'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === key
                  ? 'bg-[#0E0E0E] text-white shadow-xs'
                  : 'text-[#6B6B6B] hover:text-[#0E0E0E]'
              }`}
            >
              {key === 'ALL' ? 'All Invoices' : key === 'CONFIRMED' ? 'Awaiting Payment' : 'Paid'}
            </button>
          ))}
        </div>
      </div>
    </div>

      <DataTable
        columns={columns}
        data={invoices}
        keyExtractor={(inv) => inv.id}
        isLoading={isLoading}
        emptyTitle="No invoices found"
        emptyDescription="Invoices generated for your subscription billing cycles will appear here."
      />
    </div>
  );
}

