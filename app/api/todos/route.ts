import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
  const result = await db.execute({
    sql: `SELECT t.*, c.name as client_name
          FROM todos t
          LEFT JOIN tasks tk ON tk.id = t.task_id
          LEFT JOIN clients c ON c.id = tk.client_id
          WHERE t.date = ?
          ORDER BY t.created_at ASC`,
    args: [date],
  });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await initDb();
  const { title, date, task_id } = await req.json();
  const result = await db.execute({
    sql: 'INSERT INTO todos (title, date, task_id) VALUES (?, ?, ?)',
    args: [title, date, task_id ?? null],
  });
  const row = await db.execute({
    sql: `SELECT t.*, c.name as client_name
          FROM todos t
          LEFT JOIN tasks tk ON tk.id = t.task_id
          LEFT JOIN clients c ON c.id = tk.client_id
          WHERE t.id = ?`,
    args: [result.lastInsertRowid!],
  });
  return NextResponse.json(row.rows[0], { status: 201 });
}
