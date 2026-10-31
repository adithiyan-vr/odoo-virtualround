'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import { Calculator } from 'lucide-react';

export function PricePreview({
  basePrice,
  surcharge = 0,
  variantName,
  className,
}: {
  basePrice: number | string;
  surcharge?: number | string;
  variantName?: string;
  className?: string;
}) {
  const base = Number(basePrice) || 0;
  const extra = Number(surcharge) || 0;
  const effective = base + extra;

  return (
    <div
      className={cn(
        'p-4 rounded-2xl bg-[#FFF4EC] border border-[#FFE6D2] space-y-2 text-left',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#C2410C]">
        <Calculator className="w-4 h-4" />
        <span>Price Preview & Effective Surcharge</span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#FFE6D2]/60 text-xs">
        <div>
          <span className="text-[#6B6B6B] block">Base Price:</span>
          <span className="font-semibold text-[#0E0E0E] tabular-nums">
            {formatMoney(base)}
          </span>
        </div>
        <div>
          <span className="text-[#6B6B6B] block">
            {variantName ? `${variantName} Surcharge:` : 'Variant Surcharge:'}
          </span>
          <span className="font-semibold text-[#15803D] tabular-nums">
            +{formatMoney(extra)}
          </span>
        </div>
        <div className="border-l border-[#FFE6D2] pl-2">
          <span className="text-[#C2410C] font-semibold block">Effective Total:</span>
          <span className="font-bold text-sm text-[#0E0E0E] tabular-nums">
            {formatMoney(effective)}
          </span>
        </div>
      </div>
    </div>
  );
}

