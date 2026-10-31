'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { catalogApi, type Plan } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PolicyChips } from '@/components/shared/policy-chips';
import { toast } from '@/components/ui/toast';
import { ArrowLeft, Save, ShieldAlert, Sparkles } from 'lucide-react';

interface PlanFormProps {
  initialPlan?: Plan;
  planId?: string;
}

export function PlanForm({ initialPlan, planId }: PlanFormProps) {
  const router = useRouter();
  const isEdit = Boolean(planId);

  const [name, setName] = useState(initialPlan?.name || '');
  const [billingInterval, setBillingInterval] = useState<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  >(initialPlan?.billingInterval || 'MONTHLY');
  const [price, setPrice] = useState<number>(Number(initialPlan?.price) || 0);
  const [minQty, setMinQty] = useState<number>(initialPlan?.minQty || 1);
  const [validFrom, setValidFrom] = useState(initialPlan?.validFrom || '');
  const [validTo, setValidTo] = useState(initialPlan?.validTo || '');

  // 4 Lifecycle Policies
  const [autoClose, setAutoClose] = useState(initialPlan?.autoClose ?? true);
  const [canCloseEarly, setCanCloseEarly] = useState(initialPlan?.canCloseEarly ?? true);
  const [canPause, setCanPause] = useState(initialPlan?.canPause ?? true);
  const [canRenew, setCanRenew] = useState(initialPlan?.canRenew ?? true);
  const [isActive, setIsActive] = useState(initialPlan?.isActive ?? true);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      if (planId && !initialPlan) {
        try {
          const p = await catalogApi.getPlan(planId);
          if (p) {
            setName(p.name);
            setBillingInterval(p.billingInterval);
            setPrice(Number(p.price) || 0);
            setMinQty(p.minQty);
            setValidFrom(p.validFrom || '');
            setValidTo(p.validTo || '');
            setAutoClose(p.autoClose);
            setCanCloseEarly(p.canCloseEarly);
            setCanPause(p.canPause);
            setCanRenew(p.canRenew);
            setIsActive(p.isActive);
          }
        } catch {
          // Fallback
        }
      }
    }
    loadPlan();
  }, [planId, initialPlan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: Partial<Plan> = {
        name,
        billingInterval,
        price,
        minQty,
        validFrom: validFrom || null,
        validTo: validTo || null,
        autoClose,
        canCloseEarly,
        canPause,
        canRenew,
        isActive,
      };

      if (isEdit && planId) {
        await catalogApi.updatePlan(planId, payload);
      } else {
        await catalogApi.createPlan(payload);
      }

      toast.success(
        isEdit ? 'Plan Updated' : 'Plan Created',
        `${name} plan has been saved successfully.`
      );
      router.push('/plans');
    } catch (err: unknown) {
      toast.error(
        'Save Failed',
        err instanceof Error ? err.message : 'Unable to save plan'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/plans">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-9 h-9 p-0 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
              {isEdit ? `Edit ${name || 'Plan'}` : 'New Subscription Plan'}
            </h1>
            <p className="text-xs text-[#6B6B6B]">
              Define interval, recurring fee, and subscriber lifecycle policies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/plans">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
            <Save className="w-4 h-4" /> Save Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Plan Name"
                  required
                  placeholder="e.g. Business Monthly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Select
                  label="Billing Interval"
                  value={billingInterval}
                  onChange={(e) =>
                    setBillingInterval(
                      e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
                    )
                  }
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="DAILY">Daily</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Base Plan Fee (₹ per period)"
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  helperText="May be 0. If > 0, an automatic 'Plan fee' line is added."
                />
                <Input
                  label="Minimum Quantity"
                  type="number"
                  min="1"
                  required
                  value={minQty}
                  onChange={(e) => setMinQty(parseInt(e.target.value) || 1)}
                  helperText="Subscriptions cannot be confirmed with fewer seats/units."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7E7E3]">
                <Input
                  label="Available From"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  helperText="Leave empty for immediate availability."
                />
                <Input
                  label="Available To"
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  helperText="Leave empty for open-ended plan availability."
                />
              </div>
            </CardContent>
          </Card>

          {/* Lifecycle Policies Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FF6A1A]" />
                <span>Runtime Lifecycle Policies</span>
              </CardTitle>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                These four policies are strictly enforced across Admin, Staff, and Customer Portal actions.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Can Pause */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
                <div>
                  <span className="text-xs font-bold text-[#0E0E0E] block">
                    Allow Pausing (`can_pause`)
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Subscribers can pause billing and freeze their cycle clock.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={canPause}
                  onChange={(e) => setCanPause(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
                />
              </div>

              {/* Can Close Early */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
                <div>
                  <span className="text-xs font-bold text-[#0E0E0E] block">
                    Allow Early Closure (`can_close_early`)
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Customers or Staff can cancel or terminate the contract before its expiry date.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={canCloseEarly}
                  onChange={(e) => setCanCloseEarly(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
                />
              </div>

              {/* Can Renew */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
                <div>
                  <span className="text-xs font-bold text-[#0E0E0E] block">
                    Allow Renewal (`can_renew`)
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Contract can be extended by another term length upon expiration.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={canRenew}
                  onChange={(e) => setCanRenew(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
                />
              </div>

              {/* Auto Close */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
                <div>
                  <span className="text-xs font-bold text-[#0E0E0E] block">
                    Auto-Close on Expiry (`auto_close`)
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Sweeper job closes active subscriptions automatically once valid_to or expiryDate is reached.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoClose}
                  onChange={(e) => setAutoClose(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview & Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FF6A1A]" /> Policy Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3] space-y-2">
                <span className="text-xs font-bold text-[#0E0E0E] block">
                  Active Policy Badges:
                </span>
                <PolicyChips
                  autoClose={autoClose}
                  canCloseEarly={canCloseEarly}
                  canPause={canPause}
                  canRenew={canRenew}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3]">
                <div>
                  <span className="text-xs font-bold text-[#0E0E0E] block">
                    Plan Active
                  </span>
                  <span className="text-[11px] text-[#6B6B6B]">
                    Available in quotation templates and new sales.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6A1A] rounded cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

