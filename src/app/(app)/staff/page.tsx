'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { authApi, type User } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { UserCheck, Plus, Check, X, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password rules
  const hasMinLength = password.length >= 9;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasSpecial;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await authApi.getUsers('STAFF');
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isPasswordValid) {
      setErrorMsg('Password does not satisfy all policy requirements.');
      return;
    }

    setIsSaving(true);
    try {
      await authApi.createStaff({ name, email, password });
      toast.success('Staff Created', `Account for ${name} (${email}) created.`);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to create staff user';
      setErrorMsg(msg);
      toast.error('Creation Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const passwordRules = [
    { label: 'At least 9 characters (more than 8)', satisfied: hasMinLength },
    { label: 'At least 1 uppercase letter (A-Z)', satisfied: hasUppercase },
    { label: 'At least 1 lowercase letter (a-z)', satisfied: hasLowercase },
    { label: 'At least 1 special character (!@#$%^&*)', satisfied: hasSpecial },
  ];

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0E0E0E] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {u.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-[#0E0E0E] block">{u.name}</span>
            <span className="text-xs text-[#6B6B6B]">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'System Role',
      render: (u) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#F1F1EE] text-[#0E0E0E]">
          {u.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <StatusPill status={u.isActive ?? true ? 'ACTIVE' : 'ARCHIVED'} />
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
            Staff Management
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Admin governance for internal operators who manage quotations, billing and support.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Staff Member
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        emptyTitle="No staff members registered"
        emptyDescription="Create operator accounts to assist with sales and customer inquiries."
      />

      {/* Create Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Staff Member"
        description="Internal accounts can view catalog, create quotations, run billing, and record payments."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateStaff}
              isLoading={isSaving}
              disabled={!isPasswordValid}
            >
              Create Staff Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#FEE2E2] rounded-xl text-xs font-medium text-[#B91C1C]">
              ● {errorMsg}
            </div>
          )}

          <Input
            label="Full Name"
            required
            placeholder="Ravi Verma"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Work Email"
            type="email"
            required
            placeholder="ravi@brightloop.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <Input
              label="Temporary Password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Assign a strong initial password"
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

            {/* Checklist */}
            <div className="mt-2.5 p-3 rounded-xl bg-[#F7F7F5] border border-[#E7E7E3] space-y-1 text-left">
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
                    {rule.satisfied ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <X className="w-2 h-2" />}
                  </div>
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

