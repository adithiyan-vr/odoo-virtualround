'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { discountApi, type Discount } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { UsageMeter } from '@/components/shared/usage-meter';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@/lib/format';
import { Tag, Plus, Edit, Sparkles, Percent } from 'lucide-react';

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiscounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await discountApi.getDiscounts();
      setDiscounts(data);
    } catch {
      setDiscounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const columns: Column<Discount>[] = [
    {
      key: 'name',
      header: 'Discount Rule',
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#0E0E0E] block hover:underline">
              {d.name}
            </span>
            <span className="text-xs text-[#6B6B6B]">
              Scope:{' '}
              <strong className="text-[#0E0E0E]">
                {d.scope === 'SUBSCRIPTION' ? 'Whole Subscription' : 'Targeted Products'}
              </strong>
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Benefit Value',
      render: (d) => (
        <div className="flex items-center gap-1.5 font-bold text-sm text-[#15803D]">
          {d.type === 'PERCENT' ? (
            <>
              <Percent className="w-3.5 h-3.5" />
              <span>{d.value}% Off</span>
            </>
          ) : (
            <span>Flat {formatMoney(d.value)} Off</span>
          )}
        </div>
      ),
    },
    {
      key: 'thresholds',
      header: 'Qualification Thresholds',
      render: (d) => (
        <div className="text-xs text-[#6B6B6B] space-y-0.5">
          {Number(d.minPurchase) > 0 && (
            <div>Min Order: {formatMoney(d.minPurchase)}</div>
          )}
          {Number(d.minQty) > 0 && <div>Min Qty: {d.minQty} units</div>}
          {!d.minPurchase && !d.minQty && <span>No minimum threshold</span>}
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Usage Limit',
      render: (d) => (
        <UsageMeter currentUses={d.currentUses} maxUses={d.maxUses} />
      ),
    },
    {
      key: 'validity',
      header: 'Validity Period',
      render: (d) => (
        <span className="text-xs text-[#6B6B6B]">
          {d.startDate ? formatDate(d.startDate) : 'Open'} →{' '}
          {d.endDate ? formatDate(d.endDate) : 'Indefinite'}
        </span>
      ),
    },
    {
      key: 'autoApply',
      header: 'Auto-Apply',
      render: (d) => (
        d.autoApply ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4EC] text-[#C2410C]">
            <Sparkles className="w-3 h-3" /> Auto
          </span>
        ) : (
          <span className="text-xs text-[#9A9A9A]">Manual</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <StatusPill status={d.isActive ? 'ACTIVE' : 'EXHAUSTED'} />
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (d) => (
        <Link href={`/discounts/${d.id}`}>
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
            Discount Rules & Promotions
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Admin promotions automatically evaluated during Billing Day (percentage or fixed, threshold-gated, usage-limited).
          </p>
        </div>

        <Link href="/discounts/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-4 h-4" /> New Discount Rule
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={discounts}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        emptyTitle="No discounts created"
        emptyDescription="Create targeted promotions or general subscription discounts."
      />
    </div>
  );
}

