import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const { module_label, duration_minutes, status } = await req.json();
  await db.execute({
    sql: 'UPDATE study_sessions SET module_label=?, duration_minutes=?, status=? WHERE id=?',
    args: [module_label ?? null, duration_minutes ?? null, status, id],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM study_sessions WHERE id=?', args: [id] });
  return NextResponse.json({ ok: true });
}
