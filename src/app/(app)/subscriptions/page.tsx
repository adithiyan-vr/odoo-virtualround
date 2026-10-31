'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { subscriptionApi, type Subscription } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { Repeat, Plus, Calendar, ArrowRight, Eye } from 'lucide-react';

export default function SubscriptionsPage() {
  const { isCustomer } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSubs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await subscriptionApi.getSubscriptions({
        q: search || undefined,
        status: statusFilter || undefined,
      });
      setSubscriptions(res.data || []);
    } catch {
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const columns: Column<Subscription>[] = [
    {
      key: 'subNumber',
      header: 'Subscription #',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <Link
              href={`/subscriptions/${s.id}`}
              className="font-bold text-[#0E0E0E] hover:underline block"
            >
              {s.subNumber}
            </Link>
            <span className="text-xs text-[#6B6B6B]">
              {s.customer?.name} {s.customer?.companyName ? `(${s.customer.companyName})` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Billing Plan',
      render: (s) => (
        <span className="text-xs font-semibold text-[#0E0E0E]">
          {s.plan?.name || 'Standard'} · {s.plan?.billingInterval || 'Monthly'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Lifecycle Status',
      render: (s) => <StatusPill status={s.status} />,
    },
    {
      key: 'dates',
      header: 'Start / Expiry',
      render: (s) => (
        <span className="text-xs text-[#6B6B6B] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#9A9A9A]" />
          {formatDate(s.startDate)} → {formatDate(s.expiryDate)}
        </span>
      ),
    },
    {
      key: 'nextBillingDate',
      header: 'Next Billing',
      render: (s) => (
        <span className="text-xs font-medium text-[#0E0E0E]">
          {s.nextBillingDate ? formatDate(s.nextBillingDate) : '—'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Amount / Period',
      align: 'right',
      render: (s) => (
        <span className="font-bold text-sm tabular-nums text-[#0E0E0E]">
          {formatMoney(s.totals.total)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (s) => (
        <Link href={`/subscriptions/${s.id}`}>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
            Subscriptions & Quotations
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Manage contract states: Draft → Quotation → Confirmed → Active → Closed (plus Paused).
          </p>
        </div>

        {!isCustomer && (
          <Link href="/subscriptions/new">
            <Button variant="primary" className="gap-2">
              <Plus className="w-4 h-4" /> New Subscription
            </Button>
          </Link>
        )}
      </div>

      <DataTable
        columns={columns}
        data={subscriptions}
        keyExtractor={(s) => s.id}
        searchPlaceholder="Search by SUB number, customer or company..."
        onSearch={setSearch}
        filters={[
          {
            key: 'status',
            label: 'Status',
            selected: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Draft', value: 'DRAFT' },
              { label: 'Quotation', value: 'QUOTATION' },
              { label: 'Confirmed', value: 'CONFIRMED' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Paused', value: 'PAUSED' },
              { label: 'Closed', value: 'CLOSED' },
            ],
          },
        ]}
        isLoading={isLoading}
        emptyTitle="No subscriptions found"
        emptyDescription="Create a quote from a template or scratch to begin recurring billing."
        emptyActionLabel="Create Subscription"
        onEmptyAction={() => {}}
      />
    </div>
  );
}

