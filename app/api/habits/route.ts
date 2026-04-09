import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET() {
  await initDb();
  const result = await db.execute({ sql: 'SELECT * FROM habits WHERE active = 1 ORDER BY created_at ASC', args: [] });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await initDb();
  const { title, color } = await req.json();
  const result = await db.execute({
    sql: 'INSERT INTO habits (title, color) VALUES (?, ?)',
    args: [title, color ?? '#3b82f6'],
  });
  const row = await db.execute({ sql: 'SELECT * FROM habits WHERE id = ?', args: [result.lastInsertRowid!] });
  return NextResponse.json(row.rows[0], { status: 201 });
}
