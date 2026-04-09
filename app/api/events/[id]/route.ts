import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = await req.json();
  const { title, time, client_id, description, recurrence } = body;

  await db.execute({
    sql: `UPDATE events SET title=?, time=?, client_id=?, description=?, recurrence=? WHERE id=?`,
    args: [title, time ?? null, client_id ?? null, description ?? null, recurrence ?? 'none', id],
  });

  const result = await db.execute({
    sql: `SELECT e.*, c.name as client_name FROM events e LEFT JOIN clients c ON c.id = e.client_id WHERE e.id = ?`,
    args: [id],
  });

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM events WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
