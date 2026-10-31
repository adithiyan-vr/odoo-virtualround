'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/shared/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api-client';
import { toast } from '@/components/ui/toast';
import { Lock, Eye, EyeOff, Check, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawToken = searchParams.get('token') || '';

  const [token, setToken] = useState(rawToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Policy validation
  const hasMinLength = newPassword.length >= 9;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasSpecial;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Reset token is required.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password must satisfy all security rules.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      setIsSuccess(true);
      toast.success('Password Reset Successful', 'You can now sign in with your new password.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired token.';
      setErrorMessage(msg);
      toast.error('Reset Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRules = [
    { label: 'At least 9 characters (more than 8)', satisfied: hasMinLength },
    { label: 'At least 1 uppercase letter (A-Z)', satisfied: hasUppercase },
    { label: 'At least 1 lowercase letter (a-z)', satisfied: hasLowercase },
    { label: 'At least 1 special character (!@#$%^&*)', satisfied: hasSpecial },
  ];

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold font-display text-[#0E0E0E]">
          Password Reset Complete
        </h2>
        <p className="text-sm text-[#6B6B6B]">
          Your password has been securely updated. You can now log in to your account.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="primary" className="w-full">
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
          Set a new password
        </h1>
        <p className="text-sm text-[#6B6B6B]">
          Choose a strong password with at least 9 characters to secure your account.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs font-medium text-[#B91C1C]">
          ● {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!rawToken && (
          <Input
            label="Reset Token"
            type="text"
            required
            placeholder="Paste token from email link"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        )}

        <div>
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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

          {/* Password Policy checklist */}
          <div className="mt-3 p-3.5 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3] space-y-1 text-left">
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
                    'w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]',
                    rule.satisfied
                      ? 'bg-[#DCFCE7] text-[#15803D]'
                      : 'bg-[#E7E7E3] text-[#9A9A9A]'
                  )}
                >
                  {rule.satisfied ? (
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  ) : (
                    <X className="w-2 h-2" />
                  )}
                </div>
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          required
          placeholder="Re-type new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftAddon={<Lock className="w-4 h-4" />}
          error={
            confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined
          }
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full gap-2 mt-2"
          isLoading={isLoading}
          disabled={!isPasswordValid || !passwordsMatch}
        >
          Reset Password <ArrowRight className="w-4 h-4" />
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F7F5]">
      <div className="w-full max-w-md p-8 sm:p-10 bg-white rounded-[24px] border border-[#E7E7E3] shadow-[0_12px_40px_rgba(14,14,14,0.06)] text-left">
        <div className="mb-6 flex justify-center">
          <Logo size="md" />
        </div>
        <Suspense fallback={<div className="text-center text-sm py-8">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

