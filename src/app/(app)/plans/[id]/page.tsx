'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PlanForm } from '@/features/plans/plan-form';

function EditPlanContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <PlanForm planId={id} />;
}

export default function EditPlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading plan...</div>}>
      <EditPlanContent />
    </Suspense>
  );
}
