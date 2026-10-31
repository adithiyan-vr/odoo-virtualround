'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({
  className,
  size = 'md',
  href = '/',
  showWordmark = true,
  inverted = false,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  showWordmark?: boolean;
  inverted?: boolean;
}) {
  const sizeMap = {
    sm: { icon: 24, font: 'text-base' },
    md: { icon: 32, font: 'text-xl' },
    lg: { icon: 40, font: 'text-2xl' },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="10" fill="#FF6A1A" />
        <path
          d="M9.5 16a6.5 6.5 0 0 1 11-4.7M22.5 16a6.5 6.5 0 0 1-11 4.7"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M21 7.8v4h-4M11 24.2v-4h4"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            'font-bold tracking-tight font-display transition-colors',
            currentSize.font,
            inverted ? 'text-white' : 'text-[#0E0E0E]'
          )}
        >
          Brightloop
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="focus:outline-none">{content}</Link>;
  }

  return content;
}

