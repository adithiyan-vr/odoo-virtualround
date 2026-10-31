'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { invoiceApi, type Invoice } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { BillingModal } from '@/components/shared/billing-modal';
import { formatMoney, formatDate } from '@/lib/format';
import { FileText, Play, Printer, Eye, AlertCircle, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/export';
import { useAuth } from '@/lib/auth-context';
import { FileText, Play, Printer, Eye, AlertCircle } from 'lucide-react';

export default function InvoicesPage() {
  const { isCustomer } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [billingModalOpen, setBillingModalOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await invoiceApi.getInvoices({
        q: search || undefined,
        status: statusFilter === 'OVERDUE' ? undefined : statusFilter || undefined,
        overdue: statusFilter === 'OVERDUE' ? true : undefined,
      });
      setInvoices(res.data || []);
    } catch {
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (inv) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <Link
              href={`/invoices/${inv.id}`}
              className="font-bold text-[#0E0E0E] hover:underline block"
            >
              {inv.invoiceNumber}
            </Link>
            <span className="text-xs text-[#6B6B6B]">
              {inv.customer?.name} {inv.customer?.companyName ? `(${inv.customer.companyName})` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'subscription',
      header: 'Subscription',
      render: (inv) => (
        <span className="text-xs font-mono text-[#0E0E0E]">
          {inv.subscription?.subNumber || 'Manual Invoice'}
        </span>
      ),
    },
    {
      key: 'billingCycleDate',
      header: 'Billing Cycle',
      render: (inv) => (
        <span className="text-xs text-[#6B6B6B]">
          {formatDate(inv.billingCycleDate)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (inv) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#6B6B6B]">{formatDate(inv.dueDate)}</span>
          {inv.isOverdue && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#B91C1C]">
              <AlertCircle className="w-2.5 h-2.5" /> Overdue
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
      header: 'Total',
      align: 'right',
      render: (inv) => (
        <span className="font-semibold tabular-nums text-[#0E0E0E]">
          {formatMoney(inv.totalAmount)}
        </span>
      ),
    },
    {
      key: 'balanceDue',
      header: 'Balance Due',
      align: 'right',
      render: (inv) => (
        <span
          className={`font-bold tabular-nums ${
            Number(inv.balanceDue) > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'
          }`}
        >
          {formatMoney(inv.balanceDue)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/print/invoice/${inv.id}`} target="_blank">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href={`/invoices/${inv.id}`}>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <Eye className="w-3.5 h-3.5" /> View
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const handleExportCsv = () => {
    const headers = [
      'Invoice #',
      'Customer',
      'Invoice Date',
      'Due Date',
      'Status',
      'Is Overdue',
      'Total (INR)',
      'Paid (INR)',
      'Balance Due (INR)',
    ];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.customer?.name || '',
      formatDate(inv.billingCycleDate),
      formatDate(inv.dueDate),
      inv.status,
      inv.isOverdue ? 'YES' : 'NO',
      inv.totalAmount,
      inv.paidAmount,
      inv.balanceDue,
    ]);
    downloadCsv(`brightloop-invoices-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
            Customer Invoices
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Automated recurring invoices, tax calculations, and payment status reconciliation.
          </p>
        </div>

        {!isCustomer && (
          <Button
            variant="accent"
            onClick={() => setBillingModalOpen(true)}
            className="gap-2"
          >
            <Play className="w-4 h-4 fill-current" /> Run Billing Day Batch
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        keyExtractor={(i) => i.id}
        searchPlaceholder="Search invoices by number or customer..."
        onSearch={setSearch}
        filters={[
          {
            key: 'status',
            label: 'Status',
            selected: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Draft', value: 'DRAFT' },
              { label: 'Confirmed', value: 'CONFIRMED' },
              { label: 'Paid', value: 'PAID' },
              { label: 'Overdue', value: 'OVERDUE' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ],
          },
        ]}
        isLoading={isLoading}
        emptyTitle="No invoices found"
        emptyDescription="Run Billing Day or create a subscription to generate your first invoice."
        emptyActionLabel="Run Billing Day"
        onEmptyAction={() => setBillingModalOpen(true)}
      />

      <BillingModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        onSuccess={() => fetchInvoices()}
      />
    </div>
  );
}

