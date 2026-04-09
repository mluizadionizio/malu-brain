import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
  const result = await db.execute({
    sql: 'SELECT * FROM todos WHERE date = ? ORDER BY created_at ASC',
    args: [date],
  });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await initDb();
  const { title, date } = await req.json();
  const result = await db.execute({
    sql: 'INSERT INTO todos (title, date) VALUES (?, ?)',
    args: [title, date],
  });
  const row = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [result.lastInsertRowid!] });
  return NextResponse.json(row.rows[0], { status: 201 });
}
