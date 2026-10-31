'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { catalogApi, type TaxRule } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { Receipt, Plus, Edit } from 'lucide-react';

export default function TaxesPage() {
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRule | null>(null);
  const [name, setName] = useState('');
  const [ratePercent, setRatePercent] = useState<number>(18);
  const [appliesTo, setAppliesTo] = useState('ALL');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTaxes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await catalogApi.getTaxes();
      setTaxes(data);
    } catch {
      setTaxes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handleOpenModal = (tax?: TaxRule) => {
    if (tax) {
      setEditingTax(tax);
      setName(tax.name);
      setRatePercent(Number(tax.ratePercent));
      setAppliesTo(tax.appliesTo || 'ALL');
      setIsActive(tax.isActive);
    } else {
      setEditingTax(null);
      setName('');
      setRatePercent(18);
      setAppliesTo('ALL');
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingTax) {
        await catalogApi.updateTax(editingTax.id, {
          name,
          ratePercent,
          appliesTo,
          isActive,
        });
        toast.success('Tax Rule Updated', `${name} has been updated.`);
      } else {
        await catalogApi.createTax({
          name,
          ratePercent,
          appliesTo,
          isActive,
        });
        toast.success('Tax Rule Created', `${name} (${ratePercent}%) has been created.`);
      }
      setIsModalOpen(false);
      fetchTaxes();
    } catch (err: unknown) {
      toast.error('Save Failed', err instanceof Error ? err.message : 'Unable to save tax rule');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<TaxRule>[] = [
    {
      key: 'name',
      header: 'Tax Name',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-bold text-[#0E0E0E]">{t.name}</span>
        </div>
      ),
    },
    {
      key: 'ratePercent',
      header: 'Rate (%)',
      align: 'right',
      render: (t) => (
        <span className="font-bold tabular-nums text-[#0E0E0E]">
          {t.ratePercent}%
        </span>
      ),
    },
    {
      key: 'appliesTo',
      header: 'Scope',
      render: (t) => (
        <span className="text-xs text-[#6B6B6B]">
          {t.appliesTo === 'ALL' ? 'All Products & Services' : t.appliesTo}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <StatusPill status={t.isActive ? 'ACTIVE' : 'ARCHIVED'} />
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (t) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleOpenModal(t)}
          className="h-8 gap-1 text-xs"
        >
          <Edit className="w-3.5 h-3.5" /> Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
            Tax Rules
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Admin-defined tax rates applied automatically per invoice line during billing.
          </p>
        </div>

        <Button variant="primary" onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> New Tax Rule
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={taxes}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        emptyTitle="No tax rules configured"
        emptyDescription="Create GST or VAT rules for recurring invoicing."
      />

      {/* Tax Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTax ? 'Edit Tax Rule' : 'New Tax Rule'}
        description="Tax rules are snapshotted onto invoice lines so historical records stay accurate."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              Save Tax Rule
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Tax Name"
            required
            placeholder="e.g. GST 18%"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Rate Percentage (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            value={ratePercent}
            onChange={(e) => setRatePercent(parseFloat(e.target.value) || 0)}
          />

          <Select
            label="Applicable Scope"
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value)}
          >
            <option value="ALL">All Products & Subscriptions</option>
            <option value="SERVICES">Services Only</option>
            <option value="GOODS">Storable Goods Only</option>
          </Select>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
            <span className="text-xs font-bold text-[#0E0E0E]">Active Tax Rule</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

