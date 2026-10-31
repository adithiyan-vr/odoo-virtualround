import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      db: 'up',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'down',
        error: error instanceof Error ? error.message : 'Database check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
