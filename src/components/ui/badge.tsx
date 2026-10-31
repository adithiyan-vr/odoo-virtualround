'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'neutral'
    | 'success'
    | 'info'
    | 'warning'
    | 'danger'
    | 'orange'
    | 'dark';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  ...props
}: BadgeProps) {
  const variants = {
    neutral: 'bg-[#F1F1EE] text-[#404040] border border-transparent',
    success: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    info: 'bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE]',
    warning: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    danger: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
    orange: 'bg-[#FFF4EC] text-[#C2410C] border border-[#FFE6D2]',
    dark: 'bg-[#0E0E0E] text-white border border-[#232323]',
  };

  const sizes = {
    sm: 'h-5 px-2 text-[11px]',
    md: 'h-6 px-2.5 text-xs',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

