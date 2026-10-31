'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { customerApi, type Customer } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Users, Plus, Building, Mail, Phone } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await customerApi.getCustomers(search || undefined);
      setCustomers(data);
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await customerApi.createCustomer({
        name,
        email,
        phone,
        companyName,
        gstin,
        billingAddress,
      });
      toast.success('Customer Created', `${name} (${companyName || email}) has been registered.`);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setCompanyName('');
      setGstin('');
      setBillingAddress('');
      fetchCustomers();
    } catch (err: unknown) {
      toast.error('Creation Failed', err instanceof Error ? err.message : 'Unable to create customer');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer / Company',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FFF4EC] text-[#FF6A1A] flex items-center justify-center font-bold text-xs shrink-0">
            {c.name ? c.name.slice(0, 2).toUpperCase() : 'CU'}
          </div>
          <div>
            <span className="font-bold text-[#0E0E0E] block hover:underline">
              {c.name}
            </span>
            {c.companyName && (
              <span className="text-xs text-[#6B6B6B] flex items-center gap-1">
                <Building className="w-3 h-3 text-[#9A9A9A]" /> {c.companyName}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (c) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 text-[#0E0E0E]">
            <Mail className="w-3 h-3 text-[#6B6B6B]" /> {c.email}
          </div>
          {c.phone && (
            <div className="flex items-center gap-1.5 text-[#6B6B6B]">
              <Phone className="w-3 h-3 text-[#9A9A9A]" /> {c.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'gstin',
      header: 'GSTIN',
      render: (c) => (
        <span className="font-mono text-xs text-[#0E0E0E]">
          {c.gstin || '—'}
        </span>
      ),
    },
    {
      key: 'activeSubs',
      header: 'Subscriptions',
      align: 'center',
      render: (c) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
          {c.activeSubscriptionsCount ?? 1} active
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
            Customers Directory
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Manage client profiles, company GSTIN billing info, and linked user credentials.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        keyExtractor={(c) => c.id}
        searchPlaceholder="Search customers by name, company or email..."
        onSearch={setSearch}
        isLoading={isLoading}
        emptyTitle="No customers found"
        emptyDescription="Add business profiles to initiate contracts and quotations."
      />

      {/* Add Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Customer Profile"
        description="Profiles link to portal accounts when the customer signs up with the same email."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateCustomer} isLoading={isSaving}>
              Save Customer
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Name"
              required
              placeholder="e.g. Asha Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Company Legal Name"
              placeholder="e.g. Acme Retailers LLP"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Billing Email"
              type="email"
              required
              placeholder="billing@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GSTIN Number"
              placeholder="27AABCU9603R1ZM"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
            />
            <Input
              label="Billing Address"
              placeholder="Suite 400, Tech Park, Bengaluru"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

