'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/shared/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Mail, Lock, User, Eye, EyeOff, Check, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password rules validation
  const hasMinLength = password.length >= 9;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password security requirements before signing up.');
      return;
    }

    setIsLoading(true);

    try {
      await signup(name, email, password);
      toast.success('Account Created!', 'Welcome to Brightloop customer portal');
      window.location.href = '/portal';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Email may already be in use.';
      setErrorMessage(msg);
      toast.error('Signup Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    const suffix = Date.now().toString().slice(-4);
    setName('Asha Kumar');
    setEmail(`asha.${suffix}@brightloop.io`);
    setPassword('SecurePass123!');
    setErrorMessage('');
  };

  const passwordRules = [
    { label: 'At least 9 characters (more than 8)', satisfied: hasMinLength },
    { label: 'At least 1 uppercase letter (A-Z)', satisfied: hasUppercase },
    { label: 'At least 1 lowercase letter (a-z)', satisfied: hasLowercase },
    { label: 'At least 1 special character (!@#$%^&*)', satisfied: hasSpecial },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F7F5]">
      {/* Left Column: Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-white border-r border-[#E7E7E3]">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <Link
            href="/login"
            className="text-xs font-semibold text-[#6B6B6B] hover:text-[#0E0E0E]"
          >
            Already have an account? Sign In →
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="space-y-2 mb-8 text-left">
            <h1 className="text-3xl font-bold font-display text-[#0E0E0E] tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-[#6B6B6B]">
              Get instant access to your subscriptions, invoices, and billing statements.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs font-medium text-[#B91C1C] text-left">
              ● {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              required
              placeholder="Asha Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftAddon={<User className="w-4 h-4" />}
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="asha@shop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftAddon={<Mail className="w-4 h-4" />}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Create a strong password"
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

              {/* Live Password Policy Checklist */}
              <div className="mt-3 p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3] space-y-1.5 text-left">
                <span className="text-[11px] font-bold text-[#4A4A4A] uppercase tracking-wider block mb-1">
                  Password Requirements:
                </span>
                {passwordRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-2 text-xs transition-colors duration-150',
                      rule.satisfied ? 'text-[#15803D] font-medium' : 'text-[#6B6B6B]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]',
                        rule.satisfied
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : 'bg-[#E7E7E3] text-[#9A9A9A]'
                      )}
                    >
                      {rule.satisfied ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <X className="w-2.5 h-2.5" />
                      )}
                    </div>
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full gap-2 mt-4"
              isLoading={isLoading}
              disabled={!isPasswordValid}
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Signup Helper */}
          <div className="mt-6 p-4 rounded-2xl bg-[#F7F7F5] border border-[#E7E7E3] text-left space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E0E0E]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF6A1A]" />
                <span>Quick Test Account</span>
              </div>
              <button
                type="button"
                onClick={handleDemoFill}
                className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white border border-[#E7E7E3] hover:border-[#0E0E0E] text-[#0E0E0E] cursor-pointer"
              >
                Auto-Fill Valid Details
              </button>
            </div>
            <p className="text-[11px] text-[#6B6B6B]">
              Populates a unique email and password satisfying all 4 security criteria.
            </p>
          </div>

          <div className="mt-6 text-center text-xs text-[#6B6B6B]">
            By signing up, you agree to Brightloop&apos;s Terms of Service and Privacy Policy.
          </div>
        </div>

        <div className="text-center text-xs text-[#9A9A9A]">
          © 2026 Brightloop. All rights reserved.
        </div>
      </div>

      {/* Right Column: Hero Branding */}
      <div className="hidden md:flex md:w-1/2 bg-[#0E0E0E] text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden hero-glow">
        <div className="flex justify-end">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#232323] text-[#FF6A1A] border border-[#FF6A1A]/20">
            Customer Self-Service
          </span>
        </div>

        <div className="max-w-md mx-auto space-y-8 z-10 text-left">
          <div className="p-5 rounded-2xl bg-[#171717]/90 backdrop-blur-md border border-[#2D2D2D] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DCFCE7]/20 text-[#16A34A] flex items-center justify-center shrink-0">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Transparent Invoicing</h4>
                <p className="text-xs text-[#A3A3A3]">
                  View active subscriptions, download official invoices, and manage payment receipts anytime.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold font-display text-white leading-tight">
              Subscription billing made clear & simple.
            </h2>
            <p className="text-sm text-[#A3A3A3] leading-relaxed">
              No hidden fees, no delayed billing. Pay via Bank Transfer, UPI, or Card and track every cycle in real time.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#171717]/90 backdrop-blur-md border border-[#2D2D2D] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6A1A]/20 text-[#FF6A1A] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Strict Row-Level Privacy</h4>
                <p className="text-xs text-[#A3A3A3]">
                  Your company data and invoices are securely scoped to your customer profile only.
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

