'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A1A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.98] cursor-pointer';

    const variants = {
      // Primary: ink-950 pill, white text, hover ink-800
      primary:
        'bg-[#0E0E0E] text-white hover:bg-[#232323] shadow-sm rounded-full',
      // Accent: orange-500 pill, ink-950 text (hero action: Run Billing Day)
      accent:
        'bg-[#FF6A1A] text-[#0E0E0E] font-semibold hover:bg-[#EA5A0C] shadow-sm rounded-full',
      // Secondary: white pill, 1px ink-200, ink-950 text
      secondary:
        'bg-white text-[#0E0E0E] border border-[#E7E7E3] hover:bg-[#F1F1EE] rounded-full',
      // Ghost: transparent, ink text, hover ink-100
      ghost:
        'bg-transparent text-[#0E0E0E] hover:bg-[#F1F1EE] rounded-full',
      // Destructive: white pill with danger text, or solid danger
      destructive:
        'bg-[#FEE2E2] text-[#B91C1C] border border-[#FEE2E2] hover:bg-[#DC2626] hover:text-white rounded-full',
      // Outline
      outline:
        'bg-transparent text-[#0E0E0E] border border-[#E7E7E3] hover:bg-[#F1F1EE] rounded-full',
    };

    const sizes = {
      sm: 'h-9 px-4 text-xs gap-1.5',
      md: 'h-11 px-6 text-sm gap-2',
      lg: 'h-13 px-8 text-base gap-2.5',
      icon: 'h-10 w-10 p-0 rounded-full',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

