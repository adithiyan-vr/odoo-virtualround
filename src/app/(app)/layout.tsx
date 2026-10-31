import React, { Suspense } from 'react';
import { AppShell } from '@/components/shared/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center text-white text-xs font-sans">
          Loading Brightloop Workspace...
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
