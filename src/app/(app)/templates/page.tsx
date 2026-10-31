'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { catalogApi, type QuotationTemplate } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Plus, Edit, Clock, Layers } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await catalogApi.getTemplates();
      setTemplates(data);
    } catch {
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const columns: Column<QuotationTemplate>[] = [
    {
      key: 'name',
      header: 'Template Name',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#0E0E0E] block hover:underline">
              {t.name}
            </span>
            <span className="text-xs text-[#6B6B6B]">
              Associated Plan: <strong className="text-[#0E0E0E]">{t.plan?.name || 'Standard'}</strong>
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'validityDays',
      header: 'Quote Validity',
      render: (t) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-[#4A4A4A] font-medium">
          <Clock className="w-3.5 h-3.5 text-[#6B6B6B]" />
          {t.validityDays} days from send date
        </span>
      ),
    },
    {
      key: 'lines',
      header: 'Template Lines',
      render: (t) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F1F1EE] text-[#404040]">
          <Layers className="w-3 h-3 text-[#6B6B6B]" />
          {t.lines?.length || 0} line item{t.lines?.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (t) => (
        <Link href={`/templates/${t.id}`}>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            <Edit className="w-3.5 h-3.5" /> Edit
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
            Quotation Templates
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Pre-configure recurring plans and package line items to speed up sales quotation generation.
          </p>
        </div>

        <Link href="/templates/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={templates}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        emptyTitle="No quotation templates yet"
        emptyDescription="Create package bundles that staff can one-click load into new customer subscriptions."
      />
    </div>
  );
}

