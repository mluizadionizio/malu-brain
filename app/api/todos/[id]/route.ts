import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const { completed } = await req.json();
  await db.execute({ sql: 'UPDATE todos SET completed = ? WHERE id = ?', args: [completed ? 1 : 0, id] });
  const row = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [id] });
  return NextResponse.json(row.rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM todos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
