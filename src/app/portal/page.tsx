'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { portalApi, invoiceApi, type Subscription, type Invoice } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@/lib/format';
import {
  Repeat,
  FileText,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export default function PortalOverviewPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPortalData() {
      setIsLoading(true);
      try {
        const [subRes, invRes] = await Promise.allSettled([
          portalApi.getSubscriptions({ pageSize: 5 }),
          portalApi.getInvoices({ pageSize: 5 }),
        ]);

        if (subRes.status === 'fulfilled' && subRes.value?.subscriptions) {
          setSubscriptions(subRes.value.subscriptions);
        }
        if (invRes.status === 'fulfilled' && invRes.value?.invoices) {
          setInvoices(invRes.value.invoices);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }

    loadPortalData();
  }, []);

  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const openInvoices = invoices.filter((i) => i.status === 'CONFIRMED');
  const overdueInvoices = invoices.filter((i) => i.isOverdue);
  const totalBalanceDue = openInvoices.reduce((acc, i) => acc + Number(i.amountDue || 0), 0);

  return (
    <div className="space-y-8 text-left">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-gradient-to-r from-[#0E0E0E] to-[#1E1E1E] text-white shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-[#FFC83D] mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Self-Service Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
            Welcome back to your Subscription Hub
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A3] mt-1 max-w-xl">
            Manage your service agreements, inspect itemized billing cycles, settle invoices securely, and request plan updates in one click.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Link href="/portal/invoices">
            <Button variant="accent" className="w-full sm:w-auto gap-2">
              <CreditCard className="w-4 h-4" /> Pay Invoices
            </Button>
          </Link>
          <Link href="/portal/subscriptions">
            <Button variant="secondary" className="w-full sm:w-auto gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Repeat className="w-4 h-4" /> My Plans
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Active Services */}
        <div className="p-6 rounded-[20px] bg-white border border-[#E7E7E3] shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold">
              <Repeat className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
              Live Contract
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs text-[#6B6B6B] block">Active Subscriptions</span>
            <span className="text-3xl font-bold font-display text-[#0E0E0E] tabular-nums">
              {activeSubs.length > 0 ? activeSubs.length : 1}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#6B6B6B]">Auto-renewing and active</div>
        </div>

        {/* Card 2: Open Invoices */}
        <div className="p-6 rounded-[20px] bg-white border border-[#E7E7E3] shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] text-[#0E0E0E] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#6B6B6B] bg-[#F1F1EE] px-2.5 py-0.5 rounded-full">
              Receivables
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs text-[#6B6B6B] block">Total Balance Outstanding</span>
            <span className="text-3xl font-bold font-display text-[#0E0E0E] tabular-nums">
              {formatMoney(totalBalanceDue > 0 ? totalBalanceDue : 0)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#6B6B6B]">
            {openInvoices.length} invoices awaiting settlement
          </div>
        </div>

        {/* Card 3: Overdue Status */}
        <div className="p-6 rounded-[20px] bg-white border border-[#E7E7E3] shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${overdueInvoices.length > 0 ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#15803D]'}`}>
              {overdueInvoices.length > 0 ? 'Past Due' : 'Account Good'}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs text-[#6B6B6B] block">Overdue Invoices</span>
            <span className="text-3xl font-bold font-display text-[#DC2626] tabular-nums">
              {overdueInvoices.length}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#6B6B6B]">
            {overdueInvoices.length > 0 ? 'Immediate action required' : 'No overdue balances'}
          </div>
        </div>
      </div>

      {/* Two Column Layout: My Subscriptions & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Subscriptions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#FF6A1A]" />
                <span>My Subscriptions</span>
              </CardTitle>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                Plans and recurring service agreements.
              </p>
            </div>
            <Link
              href="/portal/subscriptions"
              className="text-xs font-semibold text-[#FF6A1A] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E7E7E3]">
              {subscriptions.slice(0, 4).map((sub) => (
                <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-[#F7F7F5]/50 transition-colors">
                  <div>
                    <Link
                      href={`/portal/subscriptions/${sub.id}`}
                      className="font-bold text-sm text-[#0E0E0E] hover:underline flex items-center gap-2"
                    >
                      {sub.subNumber}
                      <StatusPill status={sub.status} />
                    </Link>
                    <span className="text-xs text-[#6B6B6B] block mt-0.5">
                      Plan: <strong className="text-[#4A4A4A]">{sub.plan?.name || 'Standard'}</strong> · Renewal: {formatDate(sub.expiryDate || sub.nextBillingDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold tabular-nums text-sm text-[#0E0E0E] block">
                      {formatMoney(sub.recurringSubtotal || 0)}
                    </span>
                    <span className="text-[10px] text-[#6B6B6B]">per cycle</span>
                  </div>
                </div>
              ))}
              {subscriptions.length === 0 && (
                <div className="p-8 text-center text-[#6B6B6B] text-xs">
                  No active subscriptions found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Recent Invoices Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#FF6A1A]" />
                <span>Billing Invoices</span>
              </CardTitle>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                Statements, tax invoices and payment records.
              </p>
            </div>
            <Link
              href="/portal/invoices"
              className="text-xs font-semibold text-[#FF6A1A] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E7E7E3]">
              {invoices.slice(0, 4).map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-[#F7F7F5]/50 transition-colors">
                  <div>
                    <Link
                      href={`/portal/invoices/${inv.id}`}
                      className="font-bold text-sm text-[#0E0E0E] hover:underline flex items-center gap-2"
                    >
                      {inv.invoiceNumber}
                      <StatusPill status={inv.status} />
                    </Link>
                    <span className="text-xs text-[#6B6B6B] block mt-0.5">
                      Due: {formatDate(inv.dueDate)} {inv.isOverdue && <span className="text-[#DC2626] font-semibold">(Overdue)</span>}
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="font-bold tabular-nums text-sm text-[#0E0E0E] block">
                        {formatMoney(inv.totalAmount)}
                      </span>
                      {Number(inv.amountDue) > 0 ? (
                        <span className="text-[10px] text-[#DC2626] font-semibold">
                          Due: {formatMoney(inv.amountDue)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#15803D] font-semibold">
                          Settled
                        </span>
                      )}
                    </div>
                    {Number(inv.amountDue) > 0 && (
                      <Link href={`/portal/invoices/${inv.id}`}>
                        <Button variant="accent" size="sm" className="px-3 py-1 text-xs">
                          Pay
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="p-8 text-center text-[#6B6B6B] text-xs">
                  No invoices available yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
