'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, label, helperText, id, ...props }, ref) => {
    const selectId = id || React.useId();

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[#0E0E0E] uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'flex h-11 w-full appearance-none rounded-xl border border-[#E7E7E3] bg-white px-3.5 pr-10 py-2 text-sm text-[#0E0E0E]',
              'transition-colors duration-150 cursor-pointer',
              'focus:border-[#0E0E0E] focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/30',
              'disabled:cursor-not-allowed disabled:bg-[#F7F7F5] disabled:text-[#9A9A9A]',
              error && 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6B6B6B]">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {helperText && !error && (
          <p className="text-xs text-[#6B6B6B]">{helperText}</p>
        )}
        {error && (
          <p className="text-xs font-medium text-[#B91C1C] flex items-center gap-1">
            <span>●</span> {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, id, ...props }, ref) => {
    const textareaId = id || React.useId();

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-[#0E0E0E] uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-xl border border-[#E7E7E3] bg-white px-3.5 py-2.5 text-sm text-[#0E0E0E] placeholder:text-[#9A9A9A]',
            'transition-colors duration-150',
            'focus:border-[#0E0E0E] focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/30',
            'disabled:cursor-not-allowed disabled:bg-[#F7F7F5] disabled:text-[#9A9A9A]',
            error && 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20',
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-[#6B6B6B]">{helperText}</p>
        )}
        {error && (
          <p className="text-xs font-medium text-[#B91C1C] flex items-center gap-1">
            <span>●</span> {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

