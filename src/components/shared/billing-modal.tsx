'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { billingApi, type BillingRunResult } from '@/lib/api-client';
import { toast } from '@/components/ui/toast';
import { Calendar, Play, CheckCircle2, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export function BillingModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: BillingRunResult) => void;
}) {
  const [asOfDate, setAsOfDate] = useState('2026-11-01');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BillingRunResult | null>(null);

  React.useEffect(() => {
    try {
      setAsOfDate(new Date().toISOString().split('T')[0]);
    } catch {
      // Fallback
    }
  }, []);

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const res = await billingApi.runBilling(asOfDate, autoConfirm);
      setResult(res);
      toast.billing(res.eligible, res.created, res.durationMs);
      onSuccess?.(res);
    } catch (err: unknown) {
      toast.error('Billing Run Failed', err instanceof Error ? err.message : 'An error occurred during billing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={result ? 'Billing Batch Results' : 'Run Billing Day'}
      description={
        result
          ? `Idempotent execution completed for as-of date ${result.asOfDate}`
          : 'Create invoices for every active subscription that is due on or before the selected date.'
      }
      maxWidth="md"
      footer={
        result ? (
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Run Another
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Done
              </Button>
              <Link href="/invoices" onClick={handleClose}>
                <Button variant="primary">
                  View Invoices <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleRun}
              isLoading={isLoading}
              className="gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> Run Billing Batch
            </Button>
          </>
        )
      }
    >
      {result ? (
        /* Result Panel */
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-4 bg-[#DCFCE7] rounded-2xl border border-[#BBF7D0] text-[#15803D]">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Batch Processed Successfully</h4>
              <p className="text-xs text-[#15803D]/90">
                Processed in {result.durationMs}ms. Duplicate cycles were automatically skipped without conflict.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3] text-center">
              <span className="text-xs text-[#6B6B6B] block">Eligible</span>
              <span className="text-2xl font-bold font-display text-[#0E0E0E] tabular-nums">
                {result.eligible}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3] text-center">
              <span className="text-xs text-[#15803D] font-semibold block">Invoices Created</span>
              <span className="text-2xl font-bold font-display text-[#15803D] tabular-nums">
                {result.created}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3] text-center">
              <span className="text-xs text-[#6B6B6B] block">Skipped (Idempotent)</span>
              <span className="text-2xl font-bold font-display text-[#6B6B6B] tabular-nums">
                {result.skipped}
              </span>
            </div>
          </div>

          {result.invoices && result.invoices.length > 0 && (
            <div className="p-3 bg-[#F1F1EE] rounded-xl text-xs space-y-1">
              <span className="font-semibold text-[#0E0E0E]">Generated Invoices:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {result.invoices.slice(0, 8).map((inv) => (
                  <span
                    key={inv}
                    className="px-2 py-0.5 rounded-full bg-white border border-[#E7E7E3] text-[11px] font-mono text-[#0E0E0E]"
                  >
                    {inv}
                  </span>
                ))}
                {result.invoices.length > 8 && (
                  <span className="px-2 py-0.5 text-[11px] text-[#6B6B6B]">
                    +{result.invoices.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Form */
        <div className="space-y-5 py-2">
          <Input
            type="date"
            label="Simulated As-Of Date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            helperText="All active subscriptions with next_billing_date on or before this date will be invoiced."
            leftAddon={<Calendar className="w-4 h-4" />}
          />

          <div className="flex items-center gap-3 p-3.5 bg-[#F7F7F5] rounded-xl border border-[#E7E7E3]">
            <input
              type="checkbox"
              id="auto-confirm"
              checked={autoConfirm}
              onChange={(e) => setAutoConfirm(e.target.checked)}
              className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
            />
            <label htmlFor="auto-confirm" className="text-xs text-[#0E0E0E] cursor-pointer">
              <span className="font-bold block">Auto-confirm created invoices</span>
              <span className="text-[#6B6B6B]">
                Invoices will immediately enter CONFIRMED state and become ready for payment.
              </span>
            </label>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FFF4EC] border border-[#FFE6D2] text-xs text-[#C2410C]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Idempotent Guarantee:</strong> Running this batch multiple times for the same date is completely safe — previously invoiced subscriptions will be skipped.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
