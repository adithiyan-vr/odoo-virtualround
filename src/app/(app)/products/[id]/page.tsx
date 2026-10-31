'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/features/products/product-form';

function EditProductContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <ProductForm productId={id} />;
}

export default function EditProductPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading product...</div>}>
      <EditProductContent />
    </Suspense>
  );
}
