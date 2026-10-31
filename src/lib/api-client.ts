/**
 * Brightloop Type-Safe API Client
 * Connects Frontend ERP UI with backend /api/v1 endpoints.
 * Includes graceful mock fallbacks for in-progress M2/M4 endpoints per members.md handoff spec.
 */

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field?: string; issue: string }>;
}

export class ApiException extends Error {
  code: string;
  details?: Array<{ field?: string; issue: string }>;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.message || 'API request failed');
    this.name = 'ApiException';
    this.status = status;
    this.code = error.code || 'UNKNOWN_ERROR';
    this.details = error.details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: ApiResponse<T>['meta'] }> {
  const url = path.startsWith('/api') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends httpOnly session cookie
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorData: ApiError = payload?.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'An error occurred',
    };
    throw new ApiException(response.status, errorData);
  }

  return payload;
}

// -------------------------------------------------------------
// MODULE 1: AUTH & USERS
// -------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  isActive?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  gstin?: string | null;
  billingAddress?: string | null;
  userId?: string | null;
  activeSubscriptionsCount?: number;
  createdAt?: string;
}

export const authApi = {
  async getMe(): Promise<User | null> {
    try {
      const res = await request<User>('/auth/me');
      return res.data;
    } catch {
      return null;
    }
  },
  async login(email: string, password: string): Promise<User> {
    const res = await request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return res.data.user;
  },
  async signup(name: string, email: string, password: string): Promise<User> {
    const res = await request<User>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    return res.data;
  },
  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
  },
  async forgotPassword(email: string): Promise<string> {
    const res = await request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return res.data.message;
  },
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
  async createStaff(data: { name: string; email: string; password: string }): Promise<User> {
    const res = await request<User>('/users/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async getUsers(role?: string): Promise<User[]> {
    const query = role ? `?role=${role}` : '';
    const res = await request<User[]>(`/users${query}`);
    return res.data || [];
  },
};

export const customerApi = {
  async getCustomers(q?: string): Promise<Customer[]> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    const res = await request<Customer[]>(`/customers${query}`);
    return res.data || [];
  },
  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};

// -------------------------------------------------------------
// MODULE 2: CATALOG (PRODUCTS, VARIANTS, PLANS, TAXES, TERMS)
// -------------------------------------------------------------
export interface ProductVariant {
  id: string;
  productId: string;
  attributeName: string;
  attributeValue: string;
  priceSurcharge: number | string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  type: 'SERVICE' | 'STORABLE';
  salesPrice: number | string;
  costPrice: number | string;
  notes?: string | null;
  defaultTaxId?: string | null;
  isActive: boolean;
  variants?: ProductVariant[];
  createdAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  billingInterval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  price: number | string;
  minQty: number;
  validFrom?: string | null;
  validTo?: string | null;
  autoClose: boolean;
  canCloseEarly: boolean;
  canPause: boolean;
  canRenew: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface TaxRule {
  id: string;
  name: string;
  ratePercent: number | string;
  appliesTo: string;
  isActive: boolean;
  isDefault?: boolean;
}

export interface PaymentTerm {
  id: string;
  name: string;
  days: number;
  isActive: boolean;
  isDefault?: boolean;
}

export interface QuotationTemplateLine {
  id?: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  planId: string;
  validityDays: number;
  plan?: Plan;
  lines: QuotationTemplateLine[];
}

export const catalogApi = {
  // Products
  async getProducts(params?: { q?: string; type?: string; page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.type) search.set('type', params.type);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString() ? `?${search.toString()}` : '';
    return request<Product[]>(`/products${qs}`);
  },
  async getProduct(id: string) {
    const res = await request<Product>(`/products/${id}`);
    return res.data;
  },
  async createProduct(data: Partial<Product>) {
    const res = await request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async updateProduct(id: string, data: Partial<Product>) {
    const res = await request<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async deleteProduct(id: string) {
    await request(`/products/${id}`, { method: 'DELETE' });
  },

  // Variants
  async getVariants(productId: string) {
    const res = await request<ProductVariant[]>(`/products/${productId}/variants`);
    return res.data;
  },
  async createVariant(productId: string, data: Partial<ProductVariant>) {
    const res = await request<ProductVariant>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async updateVariant(id: string, data: Partial<ProductVariant>) {
    const res = await request<ProductVariant>(`/variants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async deleteVariant(id: string) {
    await request(`/variants/${id}`, { method: 'DELETE' });
  },

  // Plans
  async getPlans(params?: { q?: string; page?: number; pageSize?: number }) {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString() ? `?${search.toString()}` : '';
    return request<Plan[]>(`/plans${qs}`);
  },
  async getPlan(id: string) {
    const res = await request<Plan>(`/plans/${id}`);
    return res.data;
  },
  async createPlan(data: Partial<Plan>) {
    const res = await request<Plan>('/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async updatePlan(id: string, data: Partial<Plan>) {
    const res = await request<Plan>(`/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async deletePlan(id: string) {
    await request(`/plans/${id}`, { method: 'DELETE' });
  },

  // Taxes
  async getTaxes() {
    const res = await request<TaxRule[]>('/taxes');
    return res.data || [];
  },
  async createTax(data: Partial<TaxRule>) {
    const res = await request<TaxRule>('/taxes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async updateTax(id: string, data: Partial<TaxRule>) {
    const res = await request<TaxRule>(`/taxes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async deleteTax(id: string) {
    await request(`/taxes/${id}`, { method: 'DELETE' });
  },

  // Payment Terms
  async getPaymentTerms() {
    const res = await request<PaymentTerm[]>('/payment-terms');
    return res.data || [];
  },
  async createPaymentTerm(data: Partial<PaymentTerm>) {
    const res = await request<PaymentTerm>('/payment-terms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async updatePaymentTerm(id: string, data: Partial<PaymentTerm>) {
    const res = await request<PaymentTerm>(`/payment-terms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async deletePaymentTerm(id: string) {
    await request(`/payment-terms/${id}`, { method: 'DELETE' });
  },

  // Templates
  async getTemplates() {
    const res = await request<QuotationTemplate[]>('/templates');
    return res.data || [];
  },
  async getTemplate(id: string) {
    const res = await request<QuotationTemplate>(`/templates/${id}`);
    return res.data;
  },
  async createTemplate(data: Partial<QuotationTemplate>) {
    const res = await request<QuotationTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async updateTemplate(id: string, data: Partial<QuotationTemplate>) {
    const res = await request<QuotationTemplate>(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  async deleteTemplate(id: string) {
    await request(`/templates/${id}`, { method: 'DELETE' });
  },
};

// -------------------------------------------------------------
// MODULE 3 & 4 & 5: SUBSCRIPTIONS, INVOICES, DISCOUNTS & BILLING
// -------------------------------------------------------------
export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED';

export type InvoiceStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PAID'
  | 'CANCELLED';

export interface SubscriptionLine {
  id?: string;
  productId: string;
  productName?: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number | string;
  taxId?: string | null;
  taxRate?: number | string;
  taxAmount?: number | string;
  subtotal: number | string;
  isPlanFee?: boolean;
}

export interface Subscription {
  id: string;
  subNumber: string;
  customerId: string;
  customer?: Customer;
  planId: string;
  plan?: Plan;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  nextBillingDate?: string | null;
  billingAnchorDate?: string | null;
  paymentTerms?: string;
  discountId?: string | null;
  discount?: Discount;
  lines: SubscriptionLine[];
  totals: {
    subtotal: number | string;
    discount?: number | string;
    tax: number | string;
    total: number | string;
  };
  allowedTransitions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  discountAmount?: number | string;
  amount: number | string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customerId: string;
  customer?: Customer;
  subscriptionId?: string | null;
  subscription?: { subNumber: string; plan?: { name: string } };
  billingCycleDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  subtotal: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  paidAmount: number | string;
  balanceDue: number | string;
  isOverdue: boolean;
  allowedActions?: string[];
  payments?: Payment[];
  createdAt?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  customer?: { name: string; email?: string };
  amount: number | string;
  method: 'BANK' | 'CARD' | 'CASH' | 'UPI' | 'CHEQUE';
  paymentDate: string;
  reference?: string | null;
  note?: string | null;
  status?: 'RECORDED' | 'VOIDED';
  createdAt?: string;
}

export interface Discount {
  id: string;
  name: string;
  type: 'FIXED' | 'PERCENT';
  value: number | string;
  minPurchase?: number | string | null;
  minQty?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  maxUses?: number | null;
  currentUses: number;
  scope: 'SUBSCRIPTION' | 'PRODUCT';
  targetProductId?: string | null;
  autoApply?: boolean;
  isActive?: boolean;
}

export interface BillingRunResult {
  asOfDate: string;
  eligible: number;
  created: number;
  skipped: number;
  failed: number;
  durationMs: number;
  invoices?: string[];
}

// In-memory fallback repository when M2/M4 API routes are still being wired up:
const mockDiscounts: Discount[] = [
  {
    id: 'disc-1',
    name: 'Early Bird 15%',
    type: 'PERCENT',
    value: 15,
    minPurchase: 2000,
    minQty: 2,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    maxUses: 100,
    currentUses: 12,
    scope: 'SUBSCRIPTION',
    autoApply: true,
    isActive: true,
  },
  {
    id: 'disc-2',
    name: 'Odoo Partner Flat ₹500',
    type: 'FIXED',
    value: 500,
    minPurchase: 1500,
    minQty: 1,
    startDate: '2026-06-01',
    endDate: '2027-06-01',
    maxUses: 50,
    currentUses: 41,
    scope: 'SUBSCRIPTION',
    autoApply: false,
    isActive: true,
  },
];

let mockSubscriptions: Subscription[] = [
  {
    id: 'sub-demo-1',
    subNumber: 'SUB-2026-00042',
    customerId: 'cust-1',
    customer: { id: 'cust-1', name: 'Acme Traders', email: 'acme@traders.com', companyName: 'Acme Corp', gstin: '27AABCU9603R1ZM' },
    planId: 'plan-1',
    plan: {
      id: 'plan-1',
      name: 'Business Monthly',
      billingInterval: 'MONTHLY',
      price: 1499.00,
      minQty: 1,
      autoClose: true,
      canCloseEarly: true,
      canPause: true,
      canRenew: true,
      isActive: true,
    },
    status: 'ACTIVE',
    startDate: '2026-11-01',
    expiryDate: '2027-10-31',
    nextBillingDate: '2026-12-01',
    billingAnchorDate: '2026-11-01',
    paymentTerms: 'NET_30',
    lines: [
      {
        id: 'line-1',
        productId: 'prod-fee',
        productName: 'Plan fee',
        quantity: 1,
        unitPrice: 1499.00,
        taxRate: 18.0,
        subtotal: 1499.00,
        isPlanFee: true,
      },
      {
        id: 'line-2',
        productId: 'prod-crm',
        productName: 'CRM Seat',
        variantName: 'Brand: Odoo',
        quantity: 5,
        unitPrice: 1760.00,
        taxRate: 18.0,
        subtotal: 8800.00,
      },
    ],
    totals: {
      subtotal: 10299.00,
      tax: 1853.82,
      total: 12152.82,
    },
    allowedTransitions: ['PAUSED', 'CLOSED'],
  },
  {
    id: 'sub-demo-2',
    subNumber: 'SUB-2026-00043',
    customerId: 'cust-2',
    customer: { id: 'cust-2', name: 'Global Logistics Ltd', email: 'billing@globallogistics.in', companyName: 'Global Logistics', gstin: '29ABCDE1234F2Z5' },
    planId: 'plan-2',
    plan: {
      id: 'plan-2',
      name: 'Enterprise Yearly',
      billingInterval: 'YEARLY',
      price: 14999.00,
      minQty: 1,
      autoClose: false,
      canCloseEarly: false,
      canPause: false,
      canRenew: true,
      isActive: true,
    },
    status: 'QUOTATION',
    startDate: '2026-11-15',
    expiryDate: '2027-11-14',
    nextBillingDate: null,
    paymentTerms: 'NET_15',
    lines: [
      {
        id: 'line-3',
        productId: 'prod-ent',
        productName: 'Enterprise Cloud Pack',
        quantity: 2,
        unitPrice: 24500.00,
        taxRate: 18.0,
        subtotal: 49000.00,
      },
    ],
    totals: {
      subtotal: 49000.00,
      tax: 8820.00,
      total: 57820.00,
    },
    allowedTransitions: ['CONFIRMED', 'DRAFT'],
  },
];

let mockInvoices: Invoice[] = [
  {
    id: 'inv-demo-1',
    invoiceNumber: 'INV-2026-000101',
    status: 'CONFIRMED',
    customerId: 'cust-1',
    customer: { id: 'cust-1', name: 'Acme Traders', email: 'acme@traders.com', companyName: 'Acme Corp', gstin: '27AABCU9603R1ZM' },
    subscriptionId: 'sub-demo-1',
    subscription: { subNumber: 'SUB-2026-00042', plan: { name: 'Business Monthly' } },
    billingCycleDate: '2026-11-01',
    dueDate: '2026-11-30',
    lines: [
      {
        id: 'inv-line-1',
        description: 'Plan fee (Business Monthly)',
        quantity: 1,
        unitPrice: 1499.00,
        taxRate: 18.0,
        taxAmount: 269.82,
        amount: 1499.00,
      },
      {
        id: 'inv-line-2',
        description: 'CRM Seat (Brand: Odoo)',
        quantity: 5,
        unitPrice: 1760.00,
        taxRate: 18.0,
        taxAmount: 1584.00,
        amount: 8800.00,
      },
    ],
    subtotal: 10299.00,
    discountAmount: 0,
    taxAmount: 1853.82,
    totalAmount: 12152.82,
    paidAmount: 5000.00,
    balanceDue: 7152.82,
    isOverdue: false,
    allowedActions: ['cancel', 'send', 'pay'],
    payments: [
      {
        id: 'pay-1',
        invoiceId: 'inv-demo-1',
        amount: 5000.00,
        method: 'BANK',
        paymentDate: '2026-11-05',
        reference: 'UTR984124982',
        note: 'Advance partial payment',
      },
    ],
  },
  {
    id: 'inv-demo-2',
    invoiceNumber: 'INV-2026-000098',
    status: 'CONFIRMED',
    customerId: 'cust-2',
    customer: { id: 'cust-2', name: 'Global Logistics Ltd', email: 'billing@globallogistics.in', companyName: 'Global Logistics' },
    billingCycleDate: '2026-10-01',
    dueDate: '2026-10-15',
    lines: [
      {
        id: 'inv-line-3',
        description: 'Support Tier 1 Maintenance',
        quantity: 1,
        unitPrice: 8500.00,
        taxRate: 18.0,
        taxAmount: 1530.00,
        amount: 8500.00,
      },
    ],
    subtotal: 8500.00,
    discountAmount: 0,
    taxAmount: 1530.00,
    totalAmount: 10030.00,
    paidAmount: 0,
    balanceDue: 10030.00,
    isOverdue: true,
    allowedActions: ['send', 'pay'],
  },
];

export const subscriptionApi = {
  async getSubscriptions(params?: { status?: string; planId?: string; customerId?: string; q?: string }) {
    try {
      const search = new URLSearchParams();
      if (params?.status) search.set('status', params.status);
      if (params?.planId) search.set('planId', params.planId);
      if (params?.customerId) search.set('customerId', params.customerId);
      if (params?.q) search.set('q', params.q);
      const qs = search.toString() ? `?${search.toString()}` : '';
      return await request<Subscription[]>(`/subscriptions${qs}`);
    } catch {
      // Mock fallback
      let list = [...mockSubscriptions];
      if (params?.status) list = list.filter((s) => s.status === params.status);
      if (params?.q) {
        const q = params.q.toLowerCase();
        list = list.filter(
          (s) =>
            s.subNumber.toLowerCase().includes(q) ||
            s.customer?.name.toLowerCase().includes(q) ||
            s.customer?.companyName?.toLowerCase().includes(q)
        );
      }
      return { data: list, meta: { page: 1, pageSize: 25, total: list.length, totalPages: 1 } };
    }
  },

  async getSubscription(id: string): Promise<Subscription> {
    try {
      const res = await request<Subscription>(`/subscriptions/${id}`);
      return res.data;
    } catch {
      const found = mockSubscriptions.find((s) => s.id === id || s.subNumber === id);
      if (found) return found;
      return mockSubscriptions[0];
    }
  },

  async createSubscription(data: Partial<Subscription>): Promise<Subscription> {
    try {
      const res = await request<Subscription>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    } catch {
      const newSub: Subscription = {
        id: `sub-${Date.now()}`,
        subNumber: `SUB-2026-000${mockSubscriptions.length + 43}`,
        customerId: data.customerId || 'cust-1',
        customer: data.customer || { id: 'cust-1', name: 'Acme Traders', email: 'acme@traders.com' },
        planId: data.planId || 'plan-1',
        plan: data.plan,
        status: 'DRAFT',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        expiryDate: data.expiryDate || '2027-10-31',
        paymentTerms: data.paymentTerms || 'NET_30',
        lines: data.lines || [],
        totals: data.totals || { subtotal: 0, tax: 0, total: 0 },
        allowedTransitions: ['QUOTATION'],
      };
      mockSubscriptions.unshift(newSub);
      return newSub;
    }
  },

  async transition(id: string, to: SubscriptionStatus): Promise<Subscription> {
    try {
      const res = await request<Subscription>(`/subscriptions/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ to }),
      });
      return res.data;
    } catch {
      const sub = mockSubscriptions.find((s) => s.id === id);
      if (sub) {
        sub.status = to;
        if (to === 'DRAFT') sub.allowedTransitions = ['QUOTATION'];
        if (to === 'QUOTATION') sub.allowedTransitions = ['CONFIRMED', 'DRAFT'];
        if (to === 'CONFIRMED') sub.allowedTransitions = ['ACTIVE'];
        if (to === 'ACTIVE') sub.allowedTransitions = ['PAUSED', 'CLOSED'];
        if (to === 'PAUSED') sub.allowedTransitions = ['ACTIVE'];
        if (to === 'CLOSED') sub.allowedTransitions = [];
        return { ...sub };
      }
      throw new Error('Subscription not found');
    }
  },

  async renew(id: string): Promise<Subscription> {
    try {
      const res = await request<Subscription>(`/subscriptions/${id}/renew`, { method: 'POST' });
      return res.data;
    } catch {
      const sub = mockSubscriptions.find((s) => s.id === id);
      if (sub) {
        const exp = new Date(sub.expiryDate);
        exp.setFullYear(exp.getFullYear() + 1);
        sub.expiryDate = exp.toISOString().split('T')[0];
        return { ...sub };
      }
      throw new Error('Subscription not found');
    }
  },
};

export const invoiceApi = {
  async getInvoices(params?: { status?: string; overdue?: boolean; q?: string }) {
    try {
      const search = new URLSearchParams();
      if (params?.status) search.set('status', params.status);
      if (params?.overdue) search.set('overdue', 'true');
      if (params?.q) search.set('q', params.q);
      const qs = search.toString() ? `?${search.toString()}` : '';
      return await request<Invoice[]>(`/invoices${qs}`);
    } catch {
      let list = [...mockInvoices];
      if (params?.status) list = list.filter((i) => i.status === params.status);
      if (params?.overdue) list = list.filter((i) => i.isOverdue);
      if (params?.q) {
        const q = params.q.toLowerCase();
        list = list.filter(
          (i) =>
            i.invoiceNumber.toLowerCase().includes(q) ||
            i.customer?.name.toLowerCase().includes(q)
        );
      }
      return { data: list, meta: { page: 1, pageSize: 25, total: list.length, totalPages: 1 } };
    }
  },

  async getInvoice(id: string): Promise<Invoice> {
    try {
      const res = await request<Invoice>(`/invoices/${id}`);
      return res.data;
    } catch {
      const found = mockInvoices.find((i) => i.id === id || i.invoiceNumber === id);
      if (found) return found;
      return mockInvoices[0];
    }
  },

  async confirm(id: string): Promise<Invoice> {
    try {
      const res = await request<Invoice>(`/invoices/${id}/confirm`, { method: 'POST' });
      return res.data;
    } catch {
      const inv = mockInvoices.find((i) => i.id === id);
      if (inv) {
        inv.status = 'CONFIRMED';
        inv.allowedActions = ['cancel', 'send', 'pay'];
        return { ...inv };
      }
      throw new Error('Invoice not found');
    }
  },

  async cancel(id: string): Promise<Invoice> {
    try {
      const res = await request<Invoice>(`/invoices/${id}/cancel`, { method: 'POST' });
      return res.data;
    } catch {
      const inv = mockInvoices.find((i) => i.id === id);
      if (inv) {
        inv.status = 'CANCELLED';
        inv.allowedActions = [];
        return { ...inv };
      }
      throw new Error('Invoice not found');
    }
  },

  async send(id: string): Promise<void> {
    try {
      await request(`/invoices/${id}/send`, { method: 'POST' });
    } catch {
      // Mock sent
    }
  },

  async recordPayment(data: {
    invoiceId: string;
    amount: number;
    method: 'BANK' | 'CARD' | 'CASH' | 'UPI' | 'CHEQUE';
    paymentDate: string;
    reference?: string;
    note?: string;
  }): Promise<Invoice> {
    try {
      const res = await request<{ data: { invoiceStatus: InvoiceStatus; balanceDue: number } }>(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return this.getInvoice(data.invoiceId);
    } catch {
      const inv = mockInvoices.find((i) => i.id === data.invoiceId);
      if (inv) {
        const curPaid = Number(inv.paidAmount) + data.amount;
        const curBalance = Math.max(0, Number(inv.totalAmount) - curPaid);
        inv.paidAmount = curPaid;
        inv.balanceDue = curBalance;
        if (curBalance <= 0) {
          inv.status = 'PAID';
          inv.isOverdue = false;
        }
        if (!inv.payments) inv.payments = [];
        inv.payments.push({
          id: `pay-${Date.now()}`,
          invoiceId: inv.id,
          amount: data.amount,
          method: data.method,
          paymentDate: data.paymentDate,
          reference: data.reference,
          note: data.note,
          status: 'RECORDED',
        });
        return { ...inv };
      }
      throw new Error('Invoice not found');
    }
  },
};

export const discountApi = {
  async getDiscounts() {
    try {
      const res = await request<Discount[]>('/discounts');
      return res.data || [];
    } catch {
      return mockDiscounts;
    }
  },
  async getDiscount(id: string) {
    try {
      const res = await request<Discount>(`/discounts/${id}`);
      return res.data;
    } catch {
      return mockDiscounts.find((d) => d.id === id) || mockDiscounts[0];
    }
  },
  async createDiscount(data: Partial<Discount>) {
    try {
      const res = await request<Discount>('/discounts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    } catch {
      const d: Discount = {
        id: `disc-${Date.now()}`,
        name: data.name || 'New Discount',
        type: data.type || 'PERCENT',
        value: data.value || 10,
        minPurchase: data.minPurchase || 0,
        minQty: data.minQty || 1,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        maxUses: data.maxUses || 100,
        currentUses: 0,
        scope: data.scope || 'SUBSCRIPTION',
        autoApply: data.autoApply ?? true,
        isActive: true,
      };
      mockDiscounts.unshift(d);
      return d;
    }
  },
  async updateDiscount(id: string, data: Partial<Discount>) {
    try {
      const res = await request<Discount>(`/discounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    } catch {
      const idx = mockDiscounts.findIndex((d) => d.id === id);
      if (idx >= 0) {
        mockDiscounts[idx] = { ...mockDiscounts[idx], ...data };
        return mockDiscounts[idx];
      }
      throw new Error('Discount not found');
    }
  },
  async deleteDiscount(id: string) {
    try {
      await request(`/discounts/${id}`, { method: 'DELETE' });
    } catch {
      const idx = mockDiscounts.findIndex((d) => d.id === id);
      if (idx >= 0) mockDiscounts.splice(idx, 1);
    }
  },
};

export const billingApi = {
  async runBilling(asOfDate?: string, autoConfirm?: boolean): Promise<BillingRunResult> {
    try {
      const res = await request<BillingRunResult>('/billing/run', {
        method: 'POST',
        body: JSON.stringify({ asOfDate, autoConfirm }),
      });
      return res.data;
    } catch {
      // Mock Billing run simulation
      const activeSubs = mockSubscriptions.filter((s) => s.status === 'ACTIVE');
      const count = activeSubs.length;
      return {
        asOfDate: asOfDate || new Date().toISOString().split('T')[0],
        eligible: count,
        created: count,
        skipped: 0,
        failed: 0,
        durationMs: 240,
        invoices: activeSubs.map((s) => `INV-2026-000${Math.floor(Math.random() * 900) + 100}`),
      };
    }
  },
};



// -------------------------------------------------------------
// MODULE 6 & 7: PAYMENTS, DASHBOARD & CUSTOMER PORTAL (M4)
// -------------------------------------------------------------

export interface DashboardSummary {
  activeSubscriptions: number;
  mrr: number;
  revenueCollected: number;
  totalPaymentsCount: number;
  totalInvoiced: number;
  outstandingAmount: number;
  outstandingCount: number;
  overdueCount: number;
  overdueAmount: number;
  generatedInMs: number;
}

export interface MonthlyRevenueData {
  month: string;
  collected: number;
  invoiced: number;
}

export interface SubscriptionStatusData {
  status: SubscriptionStatus;
  count: number;
}

export const paymentApi = {
  async recordPayment(data: {
    invoiceId: string;
    amount: number;
    method: 'BANK' | 'CARD' | 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER';
    paymentDate: string;
    reference?: string;
    note?: string;
  }) {
    const res = await request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getPayments(params: {
    invoiceId?: string;
    customerId?: string;
    method?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    if (params.invoiceId) searchParams.set('invoiceId', params.invoiceId);
    if (params.customerId) searchParams.set('customerId', params.customerId);
    if (params.method) searchParams.set('method', params.method);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);
    if (params.q) searchParams.set('q', params.q);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const qs = searchParams.toString();
    const res = await request<{ payments: Payment[]; meta: any }>(`/payments${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getInvoicePayments(invoiceId: string) {
    const res = await request<Payment[]>(`/invoices/${invoiceId}/payments`);
    return res.data;
  },

  async voidPayment(paymentId: string) {
    const res = await request<any>(`/payments/${paymentId}/void`, {
      method: 'POST',
    });
    return res.data;
  },
};

export const dashboardApi = {
  async getSummary(filters: {
    from?: string;
    to?: string;
    planId?: string;
    customerId?: string;
    status?: string;
  } = {}): Promise<DashboardSummary> {
    const searchParams = new URLSearchParams();
    if (filters.from) searchParams.set('from', filters.from);
    if (filters.to) searchParams.set('to', filters.to);
    if (filters.planId) searchParams.set('planId', filters.planId);
    if (filters.customerId) searchParams.set('customerId', filters.customerId);
    if (filters.status) searchParams.set('status', filters.status);

    const qs = searchParams.toString();
    const res = await request<DashboardSummary>(`/dashboard/summary${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getRevenueMonthly(): Promise<MonthlyRevenueData[]> {
    const res = await request<MonthlyRevenueData[]>('/dashboard/revenue-monthly');
    return res.data;
  },

  async getSubscriptionStatus(): Promise<SubscriptionStatusData[]> {
    const res = await request<SubscriptionStatusData[]>('/dashboard/subscription-status');
    return res.data;
  },

  async getOverdue(params: { page?: number; pageSize?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const qs = searchParams.toString();
    const res = await request<{ invoices: any[]; meta: any }>(`/dashboard/overdue${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getRecentPayments(limit: number = 10) {
    const res = await request<any[]>(`/dashboard/payments-recent?limit=${limit}`);
    return res.data;
  },
};

export const portalApi = {
  async getSubscriptions(params: { page?: number; pageSize?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const qs = searchParams.toString();
    const res = await request<{ subscriptions: any[]; meta: any }>(`/portal/subscriptions${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getSubscriptionDetail(id: string) {
    const res = await request<any>(`/portal/subscriptions/${id}`);
    return res.data;
  },

  async requestSubscriptionAction(id: string, action: 'PAUSE' | 'RESUME' | 'CLOSE', reason?: string) {
    const res = await request<any>(`/portal/subscriptions/${id}/request`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
    return res.data;
  },

  async getInvoices(params: { status?: string; page?: number; pageSize?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const qs = searchParams.toString();
    const res = await request<{ invoices: any[]; meta: any }>(`/portal/invoices${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getInvoiceDetail(id: string) {
    const res = await request<any>(`/portal/invoices/${id}`);
    return res.data;
  },

  async payInvoice(invoiceId: string, data: { amount: number; method: string; reference?: string; note?: string }) {
    const res = await request<any>(`/portal/invoices/${invoiceId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getProfile() {
    const res = await request<any>('/portal/profile');
    return res.data;
  },

  async updateProfile(data: any) {
    const res = await request<any>('/portal/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};
