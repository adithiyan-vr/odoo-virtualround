'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function UsageMeter({
  currentUses,
  maxUses,
  className,
}: {
  currentUses: number;
  maxUses?: number | null;
  className?: string;
}) {
  if (maxUses === null || maxUses === undefined || maxUses <= 0) {
    return (
      <div className={cn('text-xs text-[#6B6B6B]', className)}>
        <span className="font-semibold text-[#0E0E0E]">{currentUses}</span> uses (unlimited)
      </div>
    );
  }

  const ratio = Math.min(100, Math.round((currentUses / maxUses) * 100));
  const isExhausted = currentUses >= maxUses;
  const isNearLimit = ratio >= 80 && !isExhausted;

  return (
    <div className={cn('w-full max-w-[160px] space-y-1', className)}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-[#0E0E0E] tabular-nums">
          {currentUses} / {maxUses}
        </span>
        <span
          className={cn(
            'font-medium',
            isExhausted && 'text-[#DC2626]',
            isNearLimit && 'text-[#D97706]',
            !isExhausted && !isNearLimit && 'text-[#6B6B6B]'
          )}
        >
          {isExhausted ? 'Exhausted' : `${ratio}%`}
        </span>
      </div>
      <div className="h-1.5 w-full bg-[#E7E7E3] rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300 rounded-full',
            isExhausted && 'bg-[#9A9A9A]',
            isNearLimit && 'bg-[#FFC83D]',
            !isExhausted && !isNearLimit && 'bg-[#FF6A1A]'
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

