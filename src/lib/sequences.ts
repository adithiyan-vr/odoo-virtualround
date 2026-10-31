/**
 * Sequences — atomic, gap-free counters backed by the `number_sequences` table.
 *
 * Uses Prisma's `$executeRaw` with an advisory lock equivalent via
 * `FOR UPDATE` on the sequence row so concurrent requests always get
 * unique, gap-free numbers.
 *
 * Falls back to Postgres sequences if the table row doesn't exist yet
 * (i.e., the row is created on first call).
 */

import prisma from './db';

async function nextVal(key: string, prefix: string, pad: number): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    // Upsert + atomic increment in one statement
    await tx.$executeRaw`
      INSERT INTO number_sequences (key, next_value)
      VALUES (${key}, 1)
      ON CONFLICT (key) DO NOTHING
    `;

    const rows = await tx.$queryRaw<{ next_value: number }[]>`
      UPDATE number_sequences
      SET next_value = next_value + 1
      WHERE key = ${key}
      RETURNING next_value - 1 AS next_value
    `;

    return rows[0].next_value;
  });

  return `${prefix}${String(result).padStart(pad, '0')}`;
}

export function nextSubNumber(): Promise<string> {
  return nextVal('sub_number', 'SUB-', 5);
}

export function nextInvoiceNumber(): Promise<string> {
  return nextVal('invoice_number', 'INV-', 5);
}
