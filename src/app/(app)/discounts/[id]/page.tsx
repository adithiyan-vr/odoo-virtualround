'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { DiscountForm } from '@/features/discounts/discount-form';

function EditDiscountContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <DiscountForm discountId={id} />;
}

export default function EditDiscountPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading discount...</div>}>
      <EditDiscountContent />
    </Suspense>
  );
}
