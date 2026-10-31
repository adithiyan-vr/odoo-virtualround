'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Repeat,
  FileText,
  User,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isAdmin, isStaff } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Overview', href: '/portal', icon: LayoutDashboard },
    { label: 'My Subscriptions', href: '/portal/subscriptions', icon: Repeat },
    { label: 'My Invoices', href: '/portal/invoices', icon: FileText },
    { label: 'Billing Profile', href: '/portal/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col font-sans text-[#0E0E0E]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E7E3] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link href="/portal" className="flex items-center gap-2">
              <Logo size="sm" />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF4EC] text-[#FF6A1A] border border-[#FF6A1A]/20">
              <ShieldCheck className="w-3 h-3" /> Customer Portal
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/portal'
                  ? pathname === '/portal'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#0E0E0E] text-white shadow-xs'
                      : 'text-[#6B6B6B] hover:text-[#0E0E0E] hover:bg-[#F1F1EE]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {(isAdmin || isStaff) && (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F1F1EE] text-[#0E0E0E] hover:bg-[#E7E7E3] transition-colors"
              >
                <span>Back-Office ERP</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-[#0E0E0E] leading-tight">
                {user?.name || 'Customer'}
              </span>
              <span className="text-[10px] text-[#6B6B6B] leading-tight">
                {user?.email || 'customer@brightloop.io'}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-[#6B6B6B] hover:text-[#DC2626] hover:bg-[#FEE2E2]/50 p-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#6B6B6B] hover:bg-[#F1F1EE]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E7E7E3] bg-white px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/portal'
                  ? pathname === '/portal'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    isActive
                      ? 'bg-[#0E0E0E] text-white'
                      : 'text-[#6B6B6B] hover:bg-[#F1F1EE]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {(isAdmin || isStaff) && (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-[#FF6A1A] bg-[#FFF4EC]"
              >
                <span>Back-Office ERP</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Portal Footer */}
      <footer className="border-t border-[#E7E7E3] bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B6B6B]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0E0E0E]">Brightloop</span>
            <span>·</span>
            <span>Customer Self-Service Portal</span>
          </div>
          <div>
            <span>Need assistance? Contact support at </span>
            <a href="mailto:support@brightloop.io" className="text-[#FF6A1A] font-semibold hover:underline">
              support@brightloop.io
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

