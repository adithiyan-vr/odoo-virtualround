'use client';

import React, { useEffect, useState } from 'react';
import { portalApi } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { User, Building, MapPin, Phone, ShieldCheck, Check } from 'lucide-react';

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [gstin, setGstin] = useState('');

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const data = await portalApi.getProfile();
        setProfile(data);
        if (data) {
          setName(data.name || '');
          setCompany(data.company || '');
          setPhone(data.phone || '');
          setAddressLine1(data.addressLine1 || '');
          setAddressLine2(data.addressLine2 || '');
          setCity(data.city || '');
          setState(data.state || '');
          setPostalCode(data.postalCode || '');
          setGstin(data.gstin || '');
        }
      } catch {
        // Fallback default
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await portalApi.updateProfile({
        name,
        company,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        gstin,
      });

      toast.success(
        'Profile Saved',
        'Your billing contact and tax information have been updated.'
      );
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not update profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-[#6B6B6B] text-sm font-semibold">
        Loading billing profile...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-display text-[#0E0E0E]">
          Account & Billing Profile
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Manage invoice recipient details, registered GSTIN, and company contact information.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-[#E7E7E3]">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-[#FF6A1A]" />
            <span>Customer Organization Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#0E0E0E] mb-1">
                  Primary Contact Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0E0E0E] mb-1">
                  Company / Organization
                </label>
                <Input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0E0E0E] mb-1">
                  Registered Email (Login ID)
                </label>
                <Input
                  type="email"
                  value={profile?.email || 'customer@brightloop.io'}
                  disabled
                  className="bg-[#F7F7F5] text-[#6B6B6B] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0E0E0E] mb-1">
                  Phone / Mobile
                </label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#0E0E0E] mb-1">
                  GSTIN (Goods and Services Tax ID)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="font-mono uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#0E0E0E] mb-1">
                  Address Line 1
                </label>
                <Input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#0E0E0E] mb-1">
                  Address Line 2 (Optional)
                </label>
                <Input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0E0E0E] mb-1">City</label>
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0E0E0E] mb-1">State</label>
                <Input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0E0E0E] mb-1">
                  Postal / ZIP Code
                </label>
                <Input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0E0E0E] mb-1">Country</label>
                <Input
                  type="text"
                  value="India (IN)"
                  disabled
                  className="bg-[#F7F7F5] text-[#6B6B6B] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E7E7E3]">
              <Button type="submit" variant="accent" disabled={isSaving} className="gap-2">
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
