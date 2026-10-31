'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'soft' | 'dark';
}

export function Card({
  className,
  variant = 'default',
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white border border-[#E7E7E3] text-[#0E0E0E] shadow-[0_1px_2px_rgba(14,14,14,0.04),0_8px_24px_rgba(14,14,14,0.06)]',
    soft: 'bg-[#F1F1EE] border border-[#E7E7E3] text-[#0E0E0E]',
    dark: 'bg-[#0E0E0E] text-white border border-[#232323]',
  };

  return (
    <div
      className={cn(
        'rounded-[20px] transition-all duration-150',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-5 md:p-6', className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-lg font-bold tracking-tight font-display text-inherit',
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[#6B6B6B]', className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 md:p-6 pt-0', className)} {...props} />
  );
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center p-5 md:p-6 pt-0', className)}
      {...props}
    />
  );
}

