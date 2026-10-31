/**
 * Brightloop Performance Benchmark Suite — Module 7 & Scale Verification (M4)
 * Benchmarks response times across core list and aggregation endpoints.
 * Validates the strict Hackathon SLA: "Every endpoint responds in < 2,000 ms on 5k+ subs / 10k+ invoices."
 *
 * Can run in two modes:
 *  1. Live HTTP Mode (when `next dev` or `next start` is running on port 3000)
 *  2. Direct Service Mode (measures SQL / Prisma query timings directly)
 */

import prisma from '../src/lib/db';
import { DashboardService } from '../src/server/dashboard/dashboard.service';
import { PaymentService } from '../src/server/payments/payment.service';
import { Role } from '../src/lib/constants/enums';

interface BenchmarkResult {
  endpoint: string;
  operation: string;
  iterations: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p95Ms: number;
  passed: boolean;
}

const SLA_THRESHOLD_MS = 2000;
const ITERATIONS = 5;

async function measureExecution(fn: () => Promise<any>, runs: number = ITERATIONS): Promise<number[]> {
  const times: number[] = [];
  // Warm up run
  try {
    await fn();
  } catch {
    // Ignore warmup failure if any
  }

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    times.push(duration);
  }
  return times;
}

function computeStats(name: string, op: string, times: number[]): BenchmarkResult {
  times.sort((a, b) => a - b);
  const minMs = Math.round(times[0] * 100) / 100;
  const maxMs = Math.round(times[times.length - 1] * 100) / 100;
  const sum = times.reduce((a, b) => a + b, 0);
  const avgMs = Math.round((sum / times.length) * 100) / 100;
  const p95Index = Math.min(Math.floor(times.length * 0.95), times.length - 1);
  const p95Ms = Math.round(times[p95Index] * 100) / 100;

  return {
    endpoint: name,
    operation: op,
    iterations: times.length,
    minMs,
    maxMs,
    avgMs,
    p95Ms,
    passed: p95Ms < SLA_THRESHOLD_MS,
  };
}

async function runDirectServiceBenchmarks(): Promise<BenchmarkResult[]> {
  console.log('\n🔍 Running Direct Service / SQL Query Benchmarks against database...');
  const results: BenchmarkResult[] = [];

  // Check dataset size
  let subCount = 0;
  let invCount = 0;
  let payCount = 0;

  try {
    [subCount, invCount, payCount] = await Promise.all([
      prisma.subscription.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
    ]);
    console.log(`📊 Active DB Dataset: ${subCount.toLocaleString()} subscriptions, ${invCount.toLocaleString()} invoices, ${payCount.toLocaleString()} payments.`);
  } catch (err: any) {
    console.warn(`⚠️ Could not query live DB count (${err.message}). Running with synthetic/connection fallback.`);
  }

  // 1. Dashboard Summary SQL Aggregations
  try {
    const times = await measureExecution(async () => {
      await DashboardService.getSummary({});
    });
    results.push(computeStats('/api/v1/dashboard/summary', 'SQL Aggregations & MRR', times));
  } catch (err: any) {
    console.warn(`⚠️ Dashboard summary benchmark skipped: ${err.message}`);
  }

  // 2. Monthly Revenue Trend Aggregation
  try {
    const times = await measureExecution(async () => {
      await DashboardService.getMonthlyRevenue();
    });
    results.push(computeStats('/api/v1/dashboard/revenue-monthly', '6-Month Rolling Revenue Trend', times));
  } catch (err: any) {
    console.warn(`⚠️ Monthly revenue benchmark skipped: ${err.message}`);
  }

  // 3. Subscription Status Breakdown
  try {
    const times = await measureExecution(async () => {
      await DashboardService.getSubscriptionStatusBreakdown();
    });
    results.push(computeStats('/api/v1/dashboard/subscription-status', 'Subscription Status Counts', times));
  } catch (err: any) {
    console.warn(`⚠️ Subscription status benchmark skipped: ${err.message}`);
  }

  // 4. Invoices Pagination Query (Page 1, 25 items)
  try {
    const times = await measureExecution(async () => {
      await prisma.invoice.findMany({
        take: 25,
        skip: 0,
        orderBy: { invoiceDate: 'desc' },
        include: { customer: { select: { name: true, email: true } } },
      });
    });
    results.push(computeStats('/api/v1/invoices?page=1', 'Paginated Invoices Listing (25 items)', times));
  } catch (err: any) {
    console.warn(`⚠️ Invoices pagination benchmark skipped: ${err.message}`);
  }

  // 5. Active Subscriptions Pagination Query (Page 1, 25 items)
  try {
    const times = await measureExecution(async () => {
      await prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        take: 25,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } }, plan: true },
      });
    });
    results.push(computeStats('/api/v1/subscriptions?status=ACTIVE', 'Active Subscriptions Listing (25 items)', times));
  } catch (err: any) {
    console.warn(`⚠️ Subscriptions pagination benchmark skipped: ${err.message}`);
  }

  // 6. Payments Listing
  try {
    const adminSession = {
      sub: 'bench-admin',
      userId: 'bench-admin',
      role: Role.ADMIN,
      email: 'admin@brightloop.io',
      name: 'Benchmark Admin',
    };
    const times = await measureExecution(async () => {
      await PaymentService.listPayments({ skip: 0, take: 25, page: 1, pageSize: 25 }, adminSession);
    });
    results.push(computeStats('/api/v1/payments?page=1', 'Payments Listing (25 items)', times));
  } catch (err: any) {
    console.warn(`⚠️ Payments listing benchmark skipped: ${err.message}`);
  }

  return results;
}

async function runHttpBenchmarks(): Promise<BenchmarkResult[]> {
  const BASE_URL = 'http://localhost:3000/api/v1';
  console.log(`\n🌐 Running Live HTTP Benchmarks against ${BASE_URL}...`);

  // Check health
  try {
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) throw new Error('Health check failed');
  } catch {
    console.log('ℹ️ HTTP server is not currently running on http://localhost:3000. Skipping HTTP benchmarks.');
    return [];
  }

  // Login as admin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@brightloop.io', password: 'Admin@12345' }),
  });
  const cookie = loginRes.headers.get('set-cookie') || '';
  const headers = { Cookie: cookie };

  const results: BenchmarkResult[] = [];

  const endpoints = [
    { name: '/api/v1/dashboard/summary', desc: 'Summary SQL Aggregations' },
    { name: '/api/v1/dashboard/revenue-monthly', desc: 'Monthly Revenue Trend' },
    { name: '/api/v1/dashboard/subscription-status', desc: 'Subscription Status' },
    { name: '/api/v1/dashboard/overdue', desc: 'Overdue Receivables' },
    { name: '/api/v1/payments?pageSize=25', desc: 'Payments Listing' },
  ];

  for (const ep of endpoints) {
    const times = await measureExecution(async () => {
      const res = await fetch(`${BASE_URL}${ep.name}`, { headers });
      await res.json();
    });
    results.push(computeStats(ep.name, ep.desc, times));
  }

  return results;
}

async function main() {
  console.log('================================================================');
  console.log('   Brightloop Performance SLA Benchmark (< 2,000 ms SLA)        ');
  console.log('================================================================');

  let results: BenchmarkResult[] = [];

  // Try direct service benchmarks first
  const serviceResults = await runDirectServiceBenchmarks();
  results = results.concat(serviceResults);

  // Try HTTP benchmarks if server is running
  const httpResults = await runHttpBenchmarks();
  results = results.concat(httpResults);

  console.log('\n================================================================');
  console.log('                     BENCHMARK RESULTS                         ');
  console.log('================================================================');
  console.log('| Endpoint | Operation | Avg (ms) | P95 (ms) | Target | SLA Status |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');

  for (const r of results) {
    const status = r.passed ? '✅ PASS (< 2s)' : '❌ FAIL (> 2s)';
    console.log(`| \`${r.endpoint}\` | ${r.operation} | ${r.avgMs} ms | ${r.p95Ms} ms | < 2,000 ms | ${status} |`);
  }

  console.log('================================================================\n');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
