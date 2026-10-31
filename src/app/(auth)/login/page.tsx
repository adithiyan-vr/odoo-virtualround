'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/shared/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Welcome back!', `Logged in as ${user.name}`);
      if (user.role === 'CUSTOMER') {
        router.push('/portal');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setErrorMessage(msg);
      toast.error('Authentication Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (role: 'admin' | 'staff' | 'customer') => {
    if (role === 'admin') {
      setEmail('admin@brightloop.io');
      setPassword('Admin#12345');
    } else if (role === 'staff') {
      setEmail('staff@brightloop.io');
      setPassword('Staff#12345');
    } else {
      setEmail('customer@brightloop.io');
      setPassword('Customer#12345');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F7F5]">
      {/* Left Column: Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white border-r border-[#E7E7E3]">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <Link
            href="/"
            className="text-xs font-semibold text-[#6B6B6B] hover:text-[#0E0E0E]"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="space-y-2 mb-8 text-left">
            <h1 className="text-3xl font-bold font-display text-[#0E0E0E] tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-[#6B6B6B]">
              Log in to your Brightloop workspace to manage subscriptions and invoices.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs font-medium text-[#B91C1C] text-left">
              ● {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftAddon={<Mail className="w-4 h-4" />}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftAddon={<Lock className="w-4 h-4" />}
                rightAddon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer hover:text-[#0E0E0E]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <div className="flex justify-end mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#C2410C] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 mt-2"
              isLoading={isLoading}
            >
              Log In <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Logins Helper */}
          <div className="mt-8 p-4 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E3] text-left space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E0E0E]">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6A1A]" />
              <span>One-Click Demo Accounts</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDemoFill('admin')}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white border border-[#E7E7E3] hover:border-[#0E0E0E] text-[#0E0E0E] cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('staff')}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white border border-[#E7E7E3] hover:border-[#0E0E0E] text-[#0E0E0E] cursor-pointer"
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('customer')}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white border border-[#E7E7E3] hover:border-[#0E0E0E] text-[#0E0E0E] cursor-pointer"
              >
                Customer
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-[#6B6B6B]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-bold text-[#C2410C] hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-[#9A9A9A]">
          © 2026 Brightloop. All rights reserved.
        </div>
      </div>

      {/* Right Column: Hero Branding & Glowing Stats */}
      <div className="hidden md:flex md:w-1/2 bg-[#0E0E0E] text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden hero-glow">
        <div className="flex justify-end">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#232323] text-[#FF6A1A] border border-[#FF6A1A]/20">
            Hackathon Build 2026
          </span>
        </div>

        <div className="max-w-md mx-auto space-y-8 z-10 text-left">
          {/* Floating Stat Card 1 */}
          <div className="p-5 rounded-2xl bg-[#171717]/90 backdrop-blur-md border border-[#2D2D2D] shadow-[0_12px_40px_rgba(0,0,0,0.5)] transform -rotate-1 hover:rotate-0 transition-transform">
            <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
              <span>Monthly Recurring Revenue</span>
              <span className="text-[#16A34A] font-bold">▲ 14.8%</span>
            </div>
            <div className="mt-2 text-3xl font-bold font-display text-white tabular-nums">
              ₹28,45,000
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#A3A3A3]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> 3,120 active subscriptions
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold font-display text-white leading-tight">
              &quot;Nothing billed twice, nothing missed.&quot;
            </h2>
            <p className="text-sm text-[#A3A3A3] leading-relaxed">
              Brightloop provides an automated subscription ledger with guaranteed idempotency, automatic taxes, and instant reconciliation.
            </p>
          </div>

          {/* Floating Stat Card 2 */}
          <div className="p-5 rounded-2xl bg-[#171717]/90 backdrop-blur-md border border-[#2D2D2D] shadow-[0_12px_40px_rgba(0,0,0,0.5)] transform rotate-1 hover:rotate-0 transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6A1A]/20 text-[#FF6A1A] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Idempotent Billing Day</h4>
                <p className="text-xs text-[#A3A3A3]">
                  Atomic cycle locks prevent duplicate invoice issuance even under concurrent executions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#6B6B6B] flex items-center justify-between z-10">
          <span>Enterprise Grade Subscription Engine</span>
          <span>PostgreSQL · Prisma</span>
        </div>
      </div>
    </div>
  );
}

