'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { catalogApi, type Product } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { Package, Plus, Layers, Edit } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await catalogApi.getProducts({
        q: search || undefined,
        type: typeFilter || undefined,
        page,
        pageSize: 25,
      });
      setProducts(res.data || []);
      setTotalCount(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      // In case of error fallback
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product / SKU',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#0E0E0E] block hover:underline">
              {p.name}
            </span>
            <span className="text-xs text-[#6B6B6B] font-mono">{p.sku}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F1F1EE] text-[#404040]">
          {p.type === 'SERVICE' ? 'Service' : 'Storable'}
        </span>
      ),
    },
    {
      key: 'salesPrice',
      header: 'Sales Price',
      align: 'right',
      render: (p) => (
        <span className="font-semibold tabular-nums text-[#0E0E0E]">
          {formatMoney(p.salesPrice)}
        </span>
      ),
    },
    {
      key: 'costPrice',
      header: 'Cost Price',
      align: 'right',
      render: (p) => (
        <span className="text-[#6B6B6B] tabular-nums">
          {formatMoney(p.costPrice)}
        </span>
      ),
    },
    {
      key: 'variants',
      header: 'Variants',
      render: (p) => {
        const count = p.variants?.length || 0;
        if (count === 0) return <span className="text-xs text-[#9A9A9A]">None</span>;
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFF4EC] text-[#C2410C]">
            <Layers className="w-3 h-3" />
            {count} variant{count > 1 ? 's' : ''}
          </span>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (p) => (
        <StatusPill status={p.isActive ? 'ACTIVE' : 'ARCHIVED'} />
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (p) => (
        <Link href={`/products/${p.id}`}>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            <Edit className="w-3.5 h-3.5" /> Edit
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
            Products & Variants
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Manage catalog items, standard prices and attribute surcharges (e.g. Brand = Odoo adds ₹560).
          </p>
        </div>

        <Link href="/products/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-4 h-4" /> New Product
          </Button>
        </Link>
      </div>

      {/* Products DataTable */}
      <DataTable
        columns={columns}
        data={products}
        keyExtractor={(p) => p.id}
        searchPlaceholder="Search products by name or SKU..."
        onSearch={setSearch}
        filters={[
          {
            key: 'type',
            label: 'Type',
            selected: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: 'Service', value: 'SERVICE' },
              { label: 'Storable Product', value: 'STORABLE' },
            ],
          },
        ]}
        totalCount={totalCount}
        currentPage={page}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyTitle="No products found"
        emptyDescription="Create your first catalog item or seed demo data to get started."
        emptyActionLabel="Create Product"
        onEmptyAction={() => {}}
      />
    </div>
  );
}

