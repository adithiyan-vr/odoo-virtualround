'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { useAuth } from '@/lib/auth-context';
import { BillingModal } from './billing-modal';
import {
  LayoutDashboard,
  Users,
  Repeat,
  FileText,
  CreditCard,
  Package,
  Layers,
  FileSpreadsheet,
  Tag,
  Receipt,
  Clock,
  UserCheck,
  Play,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Calendar,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  staffOnly?: boolean;
}

interface NavSection {
  title: string;
  adminOnly?: boolean;
  items: NavItem[];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, isStaff, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [currentCycleText, setCurrentCycleText] = useState('Current Cycle: Active');

  React.useEffect(() => {
    try {
      const now = new Date();
      setCurrentCycleText(
        `Current Cycle: ${now.toLocaleString('default', { month: 'short', year: 'numeric' })}`
      );
    } catch {
      // Fallback
    }
  }, []);

  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'SALES',
      items: [
        { label: 'Customers', href: '/customers', icon: Users },
        { label: 'Subscriptions', href: '/subscriptions', icon: Repeat },
        { label: 'Invoices', href: '/invoices', icon: FileText },
        { label: 'Payments', href: '/payments', icon: CreditCard },
      ],
    },
    {
      title: 'CATALOG',
      adminOnly: true,
      items: [
        { label: 'Products', href: '/products', icon: Package, adminOnly: true },
        { label: 'Plans', href: '/plans', icon: Layers, adminOnly: true },
        { label: 'Templates', href: '/templates', icon: FileSpreadsheet, adminOnly: true },
        { label: 'Discounts', href: '/discounts', icon: Tag, adminOnly: true },
      ],
    },
    {
      title: 'SETTINGS',
      adminOnly: true,
      items: [
        { label: 'Taxes', href: '/taxes', icon: Receipt, adminOnly: true },
        { label: 'Payment Terms', href: '/payment-terms', icon: Clock, adminOnly: true },
        { label: 'Staff Management', href: '/staff', icon: UserCheck, adminOnly: true },
      ],
    },
  ];

  // Helper for active navigation matching
  const isItemActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'BL';

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-[#0E0E0E] flex flex-col lg:flex-row p-0 lg:p-3 selection:bg-[#FF6A1A]/30">
      {/* Mobile Top Navigation Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#171717] text-white">
        <Logo size="sm" inverted />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBillingModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFC83D] text-[#0E0E0E] text-xs font-bold"
          >
            <Play className="w-3 h-3 fill-current" /> Billing
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#A3A3A3] hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop & Mobile Drawer */}
      <aside
        className={cn(
          'w-[248px] bg-[#171717] text-[#A3A3A3] flex flex-col justify-between shrink-0 transition-transform duration-200 z-40',
          'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
          'rounded-none lg:rounded-[24px] p-4 lg:p-5 overflow-y-auto'
        )}
      >
        <div className="space-y-6">
          {/* Logo Area */}
          <div className="px-2 pt-1 pb-3 border-b border-[#232323] hidden lg:block">
            <Logo size="md" inverted />
          </div>

          {/* Navigation Sections */}
          <nav className="space-y-5" aria-label="Main Navigation">
            {navSections.map((section) => {
              if (section.adminOnly && !isAdmin) return null;

              return (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 text-[11px] font-bold tracking-wider text-[#6B6B6B] uppercase font-display">
                    {section.title}
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      if (item.adminOnly && !isAdmin) return null;
                      const active = isItemActive(item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3.5 h-11 rounded-xl text-xs font-semibold transition-all duration-150',
                            active
                              ? 'bg-[#232323] text-white shadow-sm'
                              : 'text-[#A3A3A3] hover:bg-[#232323]/60 hover:text-white'
                          )}
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                              active ? 'bg-[#FF6A1A] text-[#0E0E0E]' : 'text-inherit'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Billing Card & User Info */}
        <div className="space-y-4 pt-4 border-t border-[#232323]">
          {/* Quick Trigger Billing Day Card */}
          <div className="p-3.5 rounded-2xl bg-[#232323] border border-[#2D2D2D] text-left space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC83D]">
                Billing Day
              </span>
              <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
            </div>
            <p className="text-[11px] text-[#A3A3A3] leading-snug">
              Batch create due invoices across active subscriptions.
            </p>
            <button
              onClick={() => setBillingModalOpen(true)}
              className="w-full h-8 flex items-center justify-center gap-1.5 rounded-full bg-[#FFC83D] text-[#0E0E0E] text-xs font-bold hover:bg-[#FFB703] transition-colors cursor-pointer select-none"
            >
              <Play className="w-3 h-3 fill-current" /> Run Billing Batch
            </button>
          </div>

          {/* Current User & Logout */}
          <div className="flex items-center justify-between px-2 pt-1 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#FF6A1A]/20 text-[#FF6A1A] flex items-center justify-center font-bold font-display text-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate text-xs">
                  {user?.name || 'Administrator'}
                </p>
                <p className="text-[10px] text-[#6B6B6B] truncate">
                  {user?.role || 'ADMIN'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-[#6B6B6B] hover:text-[#DC2626] rounded-lg transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Rounded Panel */}
      <main className="flex-1 flex flex-col bg-white rounded-none lg:rounded-[28px] overflow-hidden min-h-[calc(100vh-24px)] lg:ml-3">
        {/* Topbar */}
        <header className="h-16 px-6 border-b border-[#E7E7E3] flex items-center justify-between bg-white shrink-0">
          {/* Global Search Pill */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
              <input
                type="text"
                placeholder="Search customers, subscriptions, invoices..."
                className="w-full h-9 pl-9 pr-4 text-xs bg-[#F7F7F5] border border-[#E7E7E3] rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6A1A]/30 focus:border-[#0E0E0E] text-[#0E0E0E]"
              />
            </div>
          </div>

          {/* Right Topbar Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Date Range indicator */}
            <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 bg-[#F7F7F5] border border-[#E7E7E3] rounded-full text-xs text-[#4A4A4A] font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#6B6B6B]" />
              <span>{currentCycleText}</span>
            </div>

            {/* Run Billing Topbar Button */}
            <button
              onClick={() => setBillingModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#FF6A1A] text-[#0E0E0E] text-xs font-bold hover:bg-[#EA5A0C] transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" /> Run Billing Day
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                className="w-9 h-9 rounded-full border border-[#E7E7E3] flex items-center justify-center text-[#6B6B6B] hover:text-[#0E0E0E] hover:bg-[#F7F7F5]"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF6A1A]" />
              </button>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 border border-[#E7E7E3] rounded-full hover:bg-[#F7F7F5] cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#0E0E0E] text-white flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <span className="text-xs font-semibold text-[#0E0E0E] hidden sm:inline pr-1">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B6B6B] pr-1" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_12px_40px_rgba(14,14,14,0.14)] border border-[#E7E7E3] py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#E7E7E3]">
                    <p className="text-xs font-bold text-[#0E0E0E] truncate">{user?.name}</p>
                    <p className="text-[11px] text-[#6B6B6B] truncate">{user?.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F1F1EE] text-[#404040]">
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-xs text-[#DC2626] font-semibold hover:bg-[#FEE2E2]/40 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</div>
      </main>

      {/* Global Billing Day Modal */}
      <BillingModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
      />
    </div>
  );
}
