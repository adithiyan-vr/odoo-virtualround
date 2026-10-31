'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PolicyChipsProps {
  autoClose?: boolean;
  canCloseEarly?: boolean;
  canPause?: boolean;
  canRenew?: boolean;
  className?: string;
}

export function PolicyChips({
  autoClose = false,
  canCloseEarly = false,
  canPause = false,
  canRenew = false,
  className,
}: PolicyChipsProps) {
  const policies = [
    { label: 'Auto-close', active: autoClose },
    { label: 'Close early', active: canCloseEarly },
    { label: 'Pause', active: canPause },
    { label: 'Renew', active: canRenew },
  ];

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 select-none', className)}>
      {policies.map((p) => (
        <span
          key={p.label}
          className={cn(
            'inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-medium border',
            p.active
              ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
              : 'bg-[#F1F1EE] text-[#9A9A9A] border-transparent'
          )}
        >
          {p.active ? (
            <Check className="w-3 h-3 stroke-[2.5]" />
          ) : (
            <X className="w-3 h-3 stroke-[2]" />
          )}
          {p.label}
        </span>
      ))}
    </div>
  );
}

