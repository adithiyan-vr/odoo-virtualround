'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      error,
      label,
      helperText,
      leftAddon,
      rightAddon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#0E0E0E] uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#6B6B6B]">
              {leftAddon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-xl border border-[#E7E7E3] bg-white px-3.5 py-2 text-sm text-[#0E0E0E] placeholder:text-[#9A9A9A]',
              'transition-colors duration-150',
              'focus:border-[#0E0E0E] focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/30',
              'disabled:cursor-not-allowed disabled:bg-[#F7F7F5] disabled:text-[#9A9A9A]',
              leftAddon && 'pl-10',
              rightAddon && 'pr-10',
              error && 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20',
              className
            )}
            {...props}
          />
          {rightAddon && (
            <div className="absolute right-3.5 flex items-center text-[#6B6B6B]">
              {rightAddon}
            </div>
          )}
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
Input.displayName = 'Input';

