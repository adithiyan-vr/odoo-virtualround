import React, { Suspense } from 'react';
import { PortalShell } from '@/components/portal/portal-shell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center text-[#6B6B6B] text-xs font-sans">
          Loading Customer Portal...
        </div>
      }
    >
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}
