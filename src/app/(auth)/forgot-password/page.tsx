'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api-client';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
    } catch {
      // Regardless of whether email exists, show identical safe message
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F7F5]">
      <div className="w-full max-w-md p-8 sm:p-10 bg-white rounded-[24px] border border-[#E7E7E3] shadow-[0_12px_40px_rgba(14,14,14,0.06)] text-left">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>

        {isSubmitted ? (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-display text-[#0E0E0E]">
              Check your inbox
            </h2>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">
              If that email is registered, a password reset link is on its way. The link will expire in 30 minutes.
            </p>
            <div className="p-3 bg-[#F7F7F5] rounded-xl text-xs text-[#6B6B6B]">
              <span>Testing in local development? View mock emails at </span>
              <Link href="/dev/mailbox" className="font-semibold text-[#C2410C] hover:underline">
                /dev/mailbox
              </Link>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button variant="secondary" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
                Reset your password
              </h1>
              <p className="text-sm text-[#6B6B6B]">
                Enter the email associated with your account and we will send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftAddon={<Mail className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full gap-2"
                isLoading={isLoading}
              >
                Send Reset Link <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs font-semibold text-[#6B6B6B] hover:text-[#0E0E0E]"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

