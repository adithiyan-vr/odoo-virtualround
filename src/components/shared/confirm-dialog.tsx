'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel = 'Confirm',
  isDestructive = true,
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  consequence: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 text-left">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#B91C1C] shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-base font-bold text-[#0E0E0E]">{title}</h4>
          <p className="mt-1 text-sm text-[#6B6B6B] leading-relaxed">
            {consequence}
          </p>
        </div>
      </div>
    </Modal>
  );
}

