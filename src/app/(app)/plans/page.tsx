'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { catalogApi, type Plan } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { PolicyChips } from '@/components/shared/policy-chips';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@/lib/format';
import { Layers, Plus, Edit } from 'lucide-react';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await catalogApi.getPlans({
        q: search || undefined,
        page,
        pageSize: 25,
      });
      setPlans(res.data || []);
      setTotalCount(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const columns: Column<Plan>[] = [
    {
      key: 'name',
      header: 'Plan Name',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#0E0E0E] block hover:underline">
              {p.name}
            </span>
            <span className="text-xs text-[#6B6B6B]">
              Interval: <strong className="text-[#0E0E0E]">{p.billingInterval}</strong>
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Plan Fee / Period',
      align: 'right',
      render: (p) => (
        <span className="font-bold tabular-nums text-[#0E0E0E]">
          {Number(p.price) > 0 ? formatMoney(p.price) : 'Free / No fee'}
        </span>
      ),
    },
    {
      key: 'minQty',
      header: 'Min Qty',
      align: 'center',
      render: (p) => (
        <span className="tabular-nums font-semibold text-[#0E0E0E]">
          {p.minQty}
        </span>
      ),
    },
    {
      key: 'validity',
      header: 'Availability Window',
      render: (p) => (
        <span className="text-xs text-[#6B6B6B]">
          {p.validFrom ? formatDate(p.validFrom) : 'Always'} →{' '}
          {p.validTo ? formatDate(p.validTo) : 'Indefinite'}
        </span>
      ),
    },
    {
      key: 'policies',
      header: 'Lifecycle Policies',
      render: (p) => (
        <PolicyChips
          autoClose={p.autoClose}
          canCloseEarly={p.canCloseEarly}
          canPause={p.canPause}
          canRenew={p.canRenew}
        />
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (p) => <StatusPill status={p.isActive ? 'ACTIVE' : 'ARCHIVED'} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (p) => (
        <Link href={`/plans/${p.id}`}>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            <Edit className="w-3.5 h-3.5" /> Edit
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
            Subscription Plans
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Configure recurring billing intervals, minimum contract thresholds and runtime lifecycle flags.
          </p>
        </div>

        <Link href="/plans/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-4 h-4" /> New Plan
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={plans}
        keyExtractor={(p) => p.id}
        searchPlaceholder="Search plans by name..."
        onSearch={setSearch}
        totalCount={totalCount}
        currentPage={page}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyTitle="No plans found"
        emptyDescription="Create your first recurring billing plan to attach to subscriptions."
      />
    </div>
  );
}

