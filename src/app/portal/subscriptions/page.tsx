'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { portalApi } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { formatMoney, formatDate } from '@/lib/format';
import { Repeat, ArrowRight, ShieldCheck } from 'lucide-react';

export default function CustomerSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSubs() {
      setIsLoading(true);
      try {
        const res = await portalApi.getSubscriptions({ pageSize: 50 });
        setSubscriptions(res?.subscriptions || []);
      } catch {
        setSubscriptions([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadSubs();
  }, []);

  const columns: Column<any>[] = [
    {
      key: 'subNumber',
      header: 'Subscription #',
      render: (s) => (
        <div>
          <Link
            href={`/portal/subscriptions/${s.id}`}
            className="font-bold font-mono text-sm text-[#0E0E0E] hover:underline hover:text-[#FF6A1A] transition-colors"
          >
            {s.subNumber}
          </Link>
          <span className="block text-[11px] text-[#6B6B6B]">
            Plan: {s.plan?.name || 'Standard'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusPill status={s.status} />,
    },
    {
      key: 'interval',
      header: 'Billing Interval',
      render: (s) => (
        <span className="text-xs font-semibold uppercase text-[#4A4A4A]">
          {s.plan?.billingInterval || 'MONTHLY'}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Contract Window',
      render: (s) => (
        <span className="text-xs text-[#6B6B6B]">
          {formatDate(s.startDate)} → {formatDate(s.expiryDate)}
        </span>
      ),
    },
    {
      key: 'nextBillingDate',
      header: 'Next Billing Cycle',
      render: (s) => (
        <span className="text-xs font-mono text-[#0E0E0E]">
          {s.nextBillingDate ? formatDate(s.nextBillingDate) : '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Cycle Amount',
      align: 'right',
      render: (s) => (
        <span className="font-bold tabular-nums text-sm text-[#0E0E0E]">
          {formatMoney(s.recurringSubtotal || 0)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (s) => (
        <Link
          href={`/portal/subscriptions/${s.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#FF6A1A] hover:underline"
        >
          Manage <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
          My Subscriptions
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Active contracts, bundled product lines, and lifecycle policy options.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={subscriptions}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyTitle="No subscriptions active"
        emptyDescription="When your sales quotes are activated by our team, your subscriptions will appear here."
      />
    </div>
  );
}

