'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invoiceApi, type Invoice } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { toast } from '@/components/ui/toast';
import { CreditCard, Landmark, Banknote, QrCode, FileCheck } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: PaymentModalProps) {
  const balanceDueNum = Number(invoice.balanceDue) || 0;
  const [amount, setAmount] = useState<number>(balanceDueNum);
  const [method, setMethod] = useState<'BANK' | 'CARD' | 'CASH' | 'UPI' | 'CHEQUE'>('UPI');
  const [paymentDate, setPaymentDate] = useState('2026-11-01');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    try {
      setPaymentDate(new Date().toISOString().split('T')[0]);
    } catch {
      // Fallback
    }
  }, []);

  const remainingAfter = Math.max(0, balanceDueNum - amount);
  const isOverpaying = amount > balanceDueNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return;
    }

    if (isOverpaying) {
      setErrorMsg(`Amount cannot exceed the balance due of ${formatMoney(balanceDueNum)}.`);
      return;
    }

    setIsLoading(true);
    try {
      await invoiceApi.recordPayment({
        invoiceId: invoice.id,
        amount,
        method,
        paymentDate,
        reference,
        note,
      });

      toast.success(
        'Payment Recorded',
        `Recorded ${formatMoney(amount)} via ${method}. ${
          remainingAfter === 0 ? 'Invoice is now fully PAID!' : ''
        }`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment';
      setErrorMsg(msg);
      toast.error('Payment Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const methods = [
    { key: 'UPI', label: 'UPI / QR', icon: QrCode },
    { key: 'BANK', label: 'Bank Transfer', icon: Landmark },
    { key: 'CARD', label: 'Credit Card', icon: CreditCard },
    { key: 'CASH', label: 'Cash', icon: Banknote },
    { key: 'CHEQUE', label: 'Cheque', icon: FileCheck },
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      description={`Record transaction settlement against ${invoice.invoiceNumber}.`}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={amount <= 0 || isOverpaying}
          >
            Record Payment
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {errorMsg && (
          <div className="p-3 bg-[#FEE2E2] rounded-xl text-xs font-semibold text-[#B91C1C]">
            ● {errorMsg}
          </div>
        )}

        {/* Method selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#0E0E0E] uppercase tracking-wider">
            Payment Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {methods.map((m) => {
              const Icon = m.icon;
              const isSelected = method === m.key;

              return (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0E0E0E] text-white border-[#0E0E0E]'
                      : 'bg-white text-[#4A4A4A] border-[#E7E7E3] hover:bg-[#F7F7F5]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Payment Amount (₹)"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              error={
                isOverpaying
                  ? `Exceeds balance due (${formatMoney(balanceDueNum)})`
                  : undefined
              }
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B6B6B]">
              <span>Balance due: {formatMoney(balanceDueNum)}</span>
              <button
                type="button"
                onClick={() => setAmount(balanceDueNum)}
                className="font-bold text-[#FF6A1A] hover:underline cursor-pointer"
              >
                Pay Full Balance
              </button>
            </div>
          </div>

          <Input
            label="Payment Date"
            type="date"
            required
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Transaction Reference / UTR"
            placeholder="e.g. UTR-9821382"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />

          <Input
            label="Internal Note"
            placeholder="e.g. Cleared via HDFC Bank"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Live Calculation preview */}
        <div className="p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3] flex items-center justify-between text-xs">
          <span className="text-[#6B6B6B]">Remaining balance after payment:</span>
          <span
            className={`font-bold tabular-nums text-sm ${
              remainingAfter === 0 ? 'text-[#15803D]' : 'text-[#0E0E0E]'
            }`}
          >
            {formatMoney(remainingAfter)} {remainingAfter === 0 && '(Fully Paid ✓)'}
          </span>
        </div>
      </form>
    </Modal>
  );
}
