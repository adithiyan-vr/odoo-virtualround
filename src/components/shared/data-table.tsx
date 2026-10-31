'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { EmptyState } from './empty-state';
import { Button } from '@/components/ui/button';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    selected: string;
    onChange: (val: string) => void;
  }[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ElementType;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  actions?: React.ReactNode;
  onRowClick?: (row: T) => void;
  mobileCardRender?: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  searchPlaceholder = 'Search...',
  onSearch,
  filters,
  totalCount,
  currentPage = 1,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display matching the criteria.',
  emptyIcon: EmptyIcon = Search,
  onEmptyAction,
  emptyActionLabel,
  actions,
  onRowClick,
  mobileCardRender,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearch?.(val);
  };

  const total = totalCount ?? data.length;
  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, total);
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search & Filter pills */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {onSearch && (
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-8 text-xs bg-white border border-[#E7E7E3] rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/30 focus:border-[#0E0E0E] text-[#0E0E0E] placeholder:text-[#9A9A9A]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    onSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-[#0E0E0E]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Filter Chips */}
          {filters?.map((filter) => (
            <div key={filter.key} className="flex items-center gap-1">
              <select
                value={filter.selected}
                onChange={(e) => filter.onChange(e.target.value)}
                className="h-10 px-3.5 text-xs font-medium bg-white border border-[#E7E7E3] rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/30 cursor-pointer text-[#4A4A4A]"
              >
                <option value="">{filter.label}: All</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Action Buttons (e.g. Export, Add item) */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table Container */}
      <div className="rounded-[20px] bg-white border border-[#E7E7E3] shadow-[0_1px_2px_rgba(14,14,14,0.04)] overflow-hidden">
        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7E7E3] bg-[#F7F7F5]/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-5 py-3.5 text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center'
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E3]">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="h-14 animate-pulse">
                    {columns.map((col) => (
                      <td key={`skel-td-${col.key}`} className="px-5 py-4">
                        <div className="h-4 bg-[#F1F1EE] rounded-full w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8">
                    <EmptyState
                      icon={EmptyIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                      actionLabel={emptyActionLabel}
                      onAction={onEmptyAction}
                    />
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const key = keyExtractor(row);
                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        'h-14 transition-colors hover:bg-[#F7F7F5]',
                        onRowClick && 'cursor-pointer'
                      )}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            'px-5 py-3.5 text-sm text-[#0E0E0E]',
                            col.align === 'right' && 'text-right tabular-nums',
                            col.align === 'center' && 'text-center'
                          )}
                        >
                          {col.render
                            ? col.render(row)
                            : (row as Record<string, unknown>)[col.key] !== undefined
                            ? String((row as Record<string, unknown>)[col.key])
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden divide-y divide-[#E7E7E3]">
          {isLoading ? (
            <div className="p-4 space-y-3 animate-pulse">
              <div className="h-20 bg-[#F1F1EE] rounded-2xl" />
              <div className="h-20 bg-[#F1F1EE] rounded-2xl" />
            </div>
          ) : data.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={EmptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={emptyActionLabel}
                onAction={onEmptyAction}
              />
            </div>
          ) : (
            data.map((row) => {
              const key = keyExtractor(row);
              if (mobileCardRender) {
                return (
                  <div
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className="p-4 hover:bg-[#F7F7F5]"
                  >
                    {mobileCardRender(row)}
                  </div>
                );
              }
              return (
                <div
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className="p-4 space-y-2 hover:bg-[#F7F7F5]"
                >
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-[#6B6B6B]">
                        {col.header}
                      </span>
                      <span>
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] || '—')}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with pagination */}
        {!isLoading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[#E7E7E3] bg-[#F7F7F5]/30 text-xs text-[#6B6B6B]">
            <div>
              Showing <span className="font-semibold text-[#0E0E0E]">{startIdx}</span>–
              <span className="font-semibold text-[#0E0E0E]">{endIdx}</span> of{' '}
              <span className="font-semibold text-[#0E0E0E]">{total.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-4">
              {onPageSizeChange && (
                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="h-8 px-2 bg-white border border-[#E7E7E3] rounded-lg text-xs font-semibold text-[#0E0E0E] cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              )}

              {onPageChange && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-2 font-semibold text-[#0E0E0E]">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

