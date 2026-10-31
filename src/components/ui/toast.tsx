'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

let globalAddToast: ((toast: Omit<ToastItem, 'id'>) => void) | null = null;

export const toast = {
  success: (title: string, message?: string, action?: ToastItem['action']) => {
    globalAddToast?.({ type: 'success', title, message, action });
  },
  error: (title: string, message?: string) => {
    globalAddToast?.({ type: 'error', title, message });
  },
  info: (title: string, message?: string, action?: ToastItem['action']) => {
    globalAddToast?.({ type: 'info', title, message, action });
  },
  warning: (title: string, message?: string) => {
    globalAddToast?.({ type: 'warning', title, message });
  },
  billing: (processed: number, created: number, durationMs: number) => {
    globalAddToast?.({
      type: 'success',
      title: 'Billing Batch Completed',
      message: `Processed ${processed} subscriptions · ${created} invoices created · ${durationMs} ms`,
      action: {
        label: 'View invoices',
        href: '/invoices',
      },
      duration: 6000,
    });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (item: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...item, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = item.duration ?? 4000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  React.useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast viewport container at bottom-right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md pointer-events-none">
        {toasts.map((t) => {
          const borderLeftColors = {
            success: 'border-l-[#16A34A]',
            error: 'border-l-[#DC2626]',
            info: 'border-l-[#2563EB]',
            warning: 'border-l-[#F59E0B]',
          };

          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
            info: <Info className="w-5 h-5 text-[#2563EB] shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />,
          };

          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 bg-white rounded-2xl shadow-[0_12px_40px_rgba(14,14,14,0.14)] border border-[#E7E7E3] border-l-4 transition-all duration-200 animate-in slide-in-from-bottom-5',
                borderLeftColors[t.type]
              )}
            >
              {icons[t.type]}
              <div className="flex-1 text-left">
                <h4 className="text-sm font-semibold text-[#0E0E0E]">{t.title}</h4>
                {t.message && (
                  <p className="mt-0.5 text-xs text-[#6B6B6B]">{t.message}</p>
                )}
                {t.action && (
                  <div className="mt-2">
                    {t.action.href ? (
                      <Link
                        href={t.action.href}
                        onClick={() => removeToast(t.id)}
                        className="text-xs font-semibold text-[#C2410C] hover:underline"
                      >
                        {t.action.label} →
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          t.action?.onClick?.();
                          removeToast(t.id);
                        }}
                        className="text-xs font-semibold text-[#C2410C] hover:underline cursor-pointer"
                      >
                        {t.action.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-[#9A9A9A] hover:text-[#0E0E0E] p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

