'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Zap,
  Repeat,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Layers,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#0E0E0E] selection:bg-[#FF6A1A]/30">
      {/* Floating Pill Header Nav */}
      <header className="sticky top-4 z-50 max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between px-6 py-3 bg-white/90 backdrop-blur-md rounded-full border border-[#E7E7E3] shadow-sm">
          <Logo size="md" />

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#4A4A4A]">
            <a href="#features" className="hover:text-[#0E0E0E] transition-colors">
              Features
            </a>
            <a href="#benefits" className="hover:text-[#0E0E0E] transition-colors">
              Benefits
            </a>
            <a href="#pricing" className="hover:text-[#0E0E0E] transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm" className="gap-1.5">
                Get started <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with orange glow and floating cards */}
      <section className="relative pt-20 pb-24 px-4 overflow-hidden hero-glow">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white border border-[#E7E7E3] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#FF6A1A] animate-pulse" />
            <span>Odoo Hackathon 2026 Virtual Round</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold font-display text-[#0E0E0E] tracking-tight leading-[1.1]">
            Recurring revenue, <br />
            <span className="text-[#FF6A1A]">on autopilot.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base md:text-lg text-[#6B6B6B] leading-relaxed">
            Products, plans, invoices, payments, and revenue reports in one unified ERP platform. Guaranteeing zero duplicate billing and gap-free cycles.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0E0E0E]">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Automated Billing Day
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0E0E0E]">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Smart Tax & Discounts
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0E0E0E]">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> Sub-2s Live Insights
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button variant="primary" size="lg" className="gap-2 shadow-card">
                Start Free Workspace <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="accent" size="lg" className="gap-2 shadow-card">
                Launch Billing Demo <Sparkles className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Floating Stat Cards (Inspired by Reference) */}
        <div className="max-w-5xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 px-4">
          <div className="p-6 rounded-[24px] bg-white border border-[#E7E7E3] shadow-card text-left">
            <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
              <span>Monthly Recurring Revenue</span>
              <span className="text-[#16A34A] font-bold">▲ 14.8%</span>
            </div>
            <div className="mt-2 text-3xl font-bold font-display text-[#0E0E0E] tabular-nums">
              ₹28,45,000
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#6B6B6B]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Active contracts on repeat
            </div>
          </div>

          <div className="p-6 rounded-[24px] bg-[#0E0E0E] text-white border border-[#232323] shadow-card text-left">
            <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
              <span>Active Subscriptions</span>
              <span className="text-[#FF6A1A] font-bold">5,000+ Seeded</span>
            </div>
            <div className="mt-2 text-3xl font-bold font-display text-white tabular-nums">
              3,120
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#A3A3A3]">
              <span className="w-2 h-2 rounded-full bg-[#FF6A1A]" /> Invoiced on schedule
            </div>
          </div>

          <div className="p-6 rounded-[24px] bg-white border border-[#E7E7E3] shadow-card text-left">
            <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
              <span>Database Query Latency</span>
              <span className="text-[#15803D] font-bold">&lt; 200 ms</span>
            </div>
            <div className="mt-2 text-3xl font-bold font-display text-[#0E0E0E] tabular-nums">
              38 ms
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#6B6B6B]">
              <span className="w-2 h-2 rounded-full bg-[#15803D]" /> SQL filtered aggregates
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="features" className="py-20 max-w-5xl mx-auto px-4 text-left">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-[#0E0E0E]">
            Everything you need to bill on repeat
          </h2>
          <p className="text-sm text-[#6B6B6B]">
            Engineered from ground up with atomic transaction guarantees and strict RBAC.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-[24px] bg-[#F1F1EE] border border-[#E7E7E3] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-white text-[#FF6A1A] flex items-center justify-center font-bold shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#0E0E0E]">
              Automated Billing Day
            </h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Batch generate due invoices in one click with idempotency lock `UNIQUE(subscription_id, billing_cycle_date)`. Safe to run multiple times.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-[24px] bg-[#F1F1EE] border border-[#E7E7E3] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-white text-[#FF6A1A] flex items-center justify-center font-bold shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#0E0E0E]">
              Plans & Variants
            </h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Define daily, weekly, monthly, or yearly plans. Surcharge attributes like Brand=Odoo automatically add ₹560 per seat.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-[24px] bg-[#F1F1EE] border border-[#E7E7E3] space-y-4">
            <div className="w-10 h-10 rounded-xl bg-white text-[#FF6A1A] flex items-center justify-center font-bold shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#0E0E0E]">
              Finance Dashboard
            </h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Track MRR, cash collections, and overdue receivables in real time with high-performance SQL index scans.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Left-Border List Section per DESIGN.md §7.1 */}
      <section id="benefits" className="py-16 max-w-5xl mx-auto px-4 text-left border-t border-[#E7E7E3]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold font-display text-[#0E0E0E] leading-tight">
              Unlock a new era of effortless recurring revenue
            </h2>
            <p className="mt-3 text-sm text-[#6B6B6B] leading-relaxed">
              Designed according to Odoo Hackathon standards with real-world enterprise edge cases handled gracefully.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white border-l-4 border-l-[#FF6A1A] border border-[#E7E7E3] shadow-sm">
              <h4 className="text-sm font-bold text-[#0E0E0E]">
                Idempotent Billing Guarantee
              </h4>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Never twice, never missed. Duplicate cycles are automatically skipped without throwing runtime errors.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border-l-4 border-l-[#FF6A1A] border border-[#E7E7E3] shadow-sm">
              <h4 className="text-sm font-bold text-[#0E0E0E]">
                Automatic Taxes & Discounts
              </h4>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Admin-defined GST tax rates and usage-capped promotions apply smoothly to all eligible invoice lines.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border-l-4 border-l-[#FF6A1A] border border-[#E7E7E3] shadow-sm">
              <h4 className="text-sm font-bold text-[#0E0E0E]">
                Customer Self-Service Portal
              </h4>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Clients inspect their own subscriptions, download printable A4 tax invoices, and submit payments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 max-w-5xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold font-display text-[#0E0E0E] mb-2">
          Simple, transparent plans
        </h2>
        <p className="text-sm text-[#6B6B6B] mb-12">
          Scale your recurring billing operations with zero friction.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Starter */}
          <div className="p-6 rounded-[24px] bg-white border border-[#E7E7E3] shadow-card flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
                Starter
              </span>
              <div className="text-3xl font-bold font-display text-[#0E0E0E]">
                ₹499<span className="text-xs text-[#6B6B6B] font-normal"> / mo</span>
              </div>
              <p className="text-xs text-[#6B6B6B]">
                Essential subscription management for boutique services.
              </p>
              <div className="space-y-2 text-xs text-[#4A4A4A] pt-4 border-t border-[#E7E7E3]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Up to 100 active subscriptions
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Automated Billing Day
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Standard GST Invoicing
                </div>
              </div>
            </div>
            <Link href="/signup" className="mt-8">
              <Button variant="secondary" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Business (Dark / Most Popular) */}
          <div className="p-6 rounded-[24px] bg-[#0E0E0E] text-white border border-[#232323] shadow-card flex flex-col justify-between relative">
            <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[10px] font-bold bg-[#FF6A1A] text-[#0E0E0E]">
              MOST POPULAR
            </span>
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#FF6A1A] uppercase tracking-wider">
                Business
              </span>
              <div className="text-3xl font-bold font-display text-white">
                ₹1,499<span className="text-xs text-[#A3A3A3] font-normal"> / mo</span>
              </div>
              <p className="text-xs text-[#A3A3A3]">
                Full ERP suite with attribute variants, surcharge pricing & discounts.
              </p>
              <div className="space-y-2 text-xs text-[#D4D4D0] pt-4 border-t border-[#232323]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#FF6A1A]" /> Unlimited subscriptions & invoices
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#FF6A1A]" /> Attribute surcharges (Odoo +₹560)
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#FF6A1A]" /> Custom Quotation Templates
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#FF6A1A]" /> Customer self-service portal
                </div>
              </div>
            </div>
            <Link href="/signup" className="mt-8">
              <Button variant="accent" className="w-full">
                Start Business Trial
              </Button>
            </Link>
          </div>

          {/* Enterprise */}
          <div className="p-6 rounded-[24px] bg-white border border-[#E7E7E3] shadow-card flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
                Enterprise
              </span>
              <div className="text-3xl font-bold font-display text-[#0E0E0E]">
                ₹4,999<span className="text-xs text-[#6B6B6B] font-normal"> / mo</span>
              </div>
              <p className="text-xs text-[#6B6B6B]">
                High-scale operations with sub-2s response on 20,000+ invoices.
              </p>
              <div className="space-y-2 text-xs text-[#4A4A4A] pt-4 border-t border-[#E7E7E3]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Custom SQL indexing & caching
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Multi-operator staff RBAC
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Priority SLA & Audit Trail
                </div>
              </div>
            </div>
            <Link href="/signup" className="mt-8">
              <Button variant="secondary" className="w-full">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Dark CTA Band */}
      <section className="bg-[#0E0E0E] text-white py-16 px-4 relative overflow-hidden hero-glow">
        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold font-display">
            Put your billing on autopilot.
          </h2>
          <p className="text-sm text-[#A3A3A3]">
            Join innovative recurring revenue teams running Brightloop today.
          </p>
          <div className="pt-2">
            <Link href="/signup">
              <Button variant="accent" size="lg" className="gap-2">
                Get Started with Brightloop <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 max-w-5xl mx-auto px-4 border-t border-[#E7E7E3] text-xs text-[#6B6B6B] flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size="sm" />
        <div className="flex items-center gap-6">
          <span>Odoo Hackathon 2026</span>
          <span>Next.js · Prisma · PostgreSQL</span>
        </div>
        <div>© 2026 Brightloop. All rights reserved.</div>
      </footer>
    </div>
  );
}
