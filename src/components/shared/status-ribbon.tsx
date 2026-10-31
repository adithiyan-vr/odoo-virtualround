'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export type RibbonType = 'subscription' | 'invoice';

interface StatusRibbonProps {
  type?: RibbonType;
  currentStatus: string;
  isPaused?: boolean;
  className?: string;
}

const SUBSCRIPTION_STEPS = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'QUOTATION', label: 'Quotation' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'CLOSED', label: 'Closed' },
];

const INVOICE_STEPS = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PAID', label: 'Paid' },
];

export function StatusRibbon({
  type = 'subscription',
  currentStatus,
  isPaused = false,
  className,
}: StatusRibbonProps) {
  const steps = type === 'subscription' ? SUBSCRIPTION_STEPS : INVOICE_STEPS;
  const normalizedCurrent = (currentStatus || '').toUpperCase();

  // If invoice is cancelled, replace ribbon with single Cancelled tag
  if (type === 'invoice' && normalizedCurrent === 'CANCELLED') {
    return (
      <div
        className={cn(
          'inline-flex items-center px-4 py-1.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-xs font-bold border border-[#FECACA] select-none',
          className
        )}
      >
        Cancelled
      </div>
    );
  }

  // Determine active step index
  let currentIndex = steps.findIndex((s) => s.key === normalizedCurrent);
  if (normalizedCurrent === 'PAUSED' && type === 'subscription') {
    // Paused maps to the ACTIVE step
    currentIndex = steps.findIndex((s) => s.key === 'ACTIVE');
  }

  if (currentIndex === -1) {
    currentIndex = 0;
  }

  return (
    <nav
      aria-label="Lifecycle Status"
      className={cn('inline-flex items-center flex-wrap gap-1.5 select-none', className)}
    >
      {steps.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isUpcoming = idx > currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150',
                isDone && 'bg-[#F1F1EE] text-[#4A4A4A]',
                isCurrent && 'bg-[#0E0E0E] text-white shadow-sm',
                isUpcoming && 'bg-[#F7F7F5] text-[#9A9A9A] border border-dashed border-[#E7E7E3]'
              )}
            >
              {isDone && <Check className="w-3.5 h-3.5 text-[#6B6B6B]" />}
              {isCurrent && (
                <span className="w-2 h-2 rounded-full bg-[#FF6A1A] animate-pulse" />
              )}
              <span>{step.label}</span>

              {/* Special badge for Paused condition on the Active step */}
              {isCurrent && (normalizedCurrent === 'PAUSED' || isPaused) && step.key === 'ACTIVE' && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-[#FF6A1A] text-[#0E0E0E] font-bold rounded-full">
                  Paused
                </span>
              )}
            </div>

            {idx < steps.length - 1 && (
              <span className="text-[#9A9A9A] text-xs select-none">›</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

