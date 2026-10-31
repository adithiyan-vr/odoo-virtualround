'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { catalogApi, type PaymentTerm } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Clock, Plus, Edit } from 'lucide-react';

export default function PaymentTermsPage() {
  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  const [name, setName] = useState('');
  const [days, setDays] = useState<number>(30);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTerms = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await catalogApi.getPaymentTerms();
      setTerms(data);
    } catch {
      setTerms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const handleOpenModal = (term?: PaymentTerm) => {
    if (term) {
      setEditingTerm(term);
      setName(term.name);
      setDays(term.days);
      setIsActive(term.isActive);
    } else {
      setEditingTerm(null);
      setName('');
      setDays(30);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingTerm) {
        await catalogApi.updatePaymentTerm(editingTerm.id, { name, days, isActive });
        toast.success('Term Updated', `${name} has been updated.`);
      } else {
        await catalogApi.createPaymentTerm({ name, days, isActive });
        toast.success('Term Created', `${name} (${days} days) has been created.`);
      }
      setIsModalOpen(false);
      fetchTerms();
    } catch (err: unknown) {
      toast.error('Save Failed', err instanceof Error ? err.message : 'Unable to save term');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<PaymentTerm>[] = [
    {
      key: 'name',
      header: 'Payment Term',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <span className="font-bold text-[#0E0E0E]">{t.name}</span>
        </div>
      ),
    },
    {
      key: 'days',
      header: 'Net Credit Days',
      align: 'center',
      render: (t) => (
        <span className="font-bold tabular-nums text-[#0E0E0E]">
          {t.days} day{t.days !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'dueRule',
      header: 'Due Date Calculation',
      render: (t) => (
        <span className="text-xs text-[#6B6B6B]">
          Invoice Date + {t.days} days
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusPill status={t.isActive ? 'ACTIVE' : 'ARCHIVED'} />,
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
            Payment Terms
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Credit periods determining invoice due dates and overdue calculation (e.g. Net 15, Net 30).
          </p>
        </div>

        <Button variant="primary" onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> New Payment Term
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={terms}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        emptyTitle="No payment terms configured"
        emptyDescription="Create standard terms (Immediate, Net 15, Net 30)."
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTerm ? 'Edit Payment Term' : 'New Payment Term'}
        description="Payment terms automatically set invoice due dates upon Billing Day generation."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              Save Term
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Term Name"
            required
            placeholder="e.g. Net 30 Days"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Credit Days"
            type="number"
            min="0"
            required
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            helperText="0 = Immediate payment due on invoice issuance."
          />

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
            <span className="text-xs font-bold text-[#0E0E0E]">Active Term</span>
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

