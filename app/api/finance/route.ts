import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const year = req.nextUrl.searchParams.get('year');
  const month = req.nextUrl.searchParams.get('month');

  if (!year || !month) {
    return NextResponse.json({ error: 'year and month required' }, { status: 400 });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM finance_entries WHERE year = ? AND month = ? ORDER BY day ASC',
    args: [parseInt(year), parseInt(month)],
  });

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { year, month, day, entrada, saida, diario } = body;

  await db.execute({
    sql: `INSERT INTO finance_entries (year, month, day, entrada, saida, diario)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(year, month, day) DO UPDATE SET
            entrada = excluded.entrada,
            saida = excluded.saida,
            diario = excluded.diario`,
    args: [year, month, day, entrada ?? 0, saida ?? 0, diario ?? 0],
  });

  const result = await db.execute({
    sql: 'SELECT * FROM finance_entries WHERE year = ? AND month = ? AND day = ?',
    args: [year, month, day],
  });

  return NextResponse.json(result.rows[0]);
}
