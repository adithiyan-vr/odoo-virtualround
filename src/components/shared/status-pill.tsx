'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type StatusCategory =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED'
  | 'EXPIRED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'RECORDED'
  | 'VOIDED'
  | 'ARCHIVED'
  | 'EXHAUSTED';

interface StatusConfig {
  label: string;
  className: string;
  dotColor?: string;
  strikethrough?: boolean;
}

const statusMap: Record<string, StatusConfig> = {
  // Subscriptions
  DRAFT: {
    label: 'Draft',
    className: 'bg-[#F1F1EE] text-[#404040] border-[#E7E7E3]',
    dotColor: 'bg-[#6B6B6B]',
  },
  QUOTATION: {
    label: 'Quotation',
    className: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]',
    dotColor: 'bg-[#2563EB]',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    dotColor: 'bg-[#F59E0B]',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    dotColor: 'bg-[#16A34A]',
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-[#FFF4EC] text-[#C2410C] border-[#FFE6D2]',
    dotColor: 'bg-[#FF6A1A]',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-[#0E0E0E] text-white border-[#232323]',
    dotColor: 'bg-white',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
    dotColor: 'bg-[#DC2626]',
  },

  // Invoices
  PAID: {
    label: 'Paid',
    className: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    dotColor: 'bg-[#16A34A]',
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    className: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    dotColor: 'bg-[#F59E0B]',
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
    dotColor: 'bg-[#DC2626]',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-[#F1F1EE] text-[#6B6B6B] border-[#E7E7E3]',
    strikethrough: true,
  },

  // Payments & Master Data
  RECORDED: {
    label: 'Recorded',
    className: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    dotColor: 'bg-[#16A34A]',
  },
  VOIDED: {
    label: 'Voided',
    className: 'bg-[#F1F1EE] text-[#6B6B6B] border-[#E7E7E3]',
    strikethrough: true,
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-[#F1F1EE] text-[#6B6B6B] border-[#E7E7E3]',
  },
  EXHAUSTED: {
    label: 'Exhausted',
    className: 'bg-[#F1F1EE] text-[#6B6B6B] border-[#E7E7E3]',
  },
};

export function StatusPill({
  status,
  labelOverride,
  showDot = true,
  className,
}: {
  status: string;
  labelOverride?: string;
  showDot?: boolean;
  className?: string;
}) {
  const normalizedKey = (status || '').toUpperCase().replace(/[\s-]/g, '_');
  const config = statusMap[normalizedKey] || {
    label: status || 'Unknown',
    className: 'bg-[#F1F1EE] text-[#404040] border-[#E7E7E3]',
    dotColor: 'bg-[#6B6B6B]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold border select-none',
        config.className,
        className
      )}
    >
      {showDot && config.dotColor && !config.strikethrough && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotColor)} />
      )}
      <span className={cn(config.strikethrough && 'line-through')}>
        {labelOverride || config.label}
      </span>
    </span>
  );
}

