'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { TemplateForm } from '@/features/templates/template-form';

function EditTemplateContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <TemplateForm templateId={id} />;
}

export default function EditTemplatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading template...</div>}>
      <EditTemplateContent />
    </Suspense>
  );
}
