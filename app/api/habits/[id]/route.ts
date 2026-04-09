import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const { title, color } = await req.json();
  await db.execute({
    sql: 'UPDATE habits SET title = ?, color = ? WHERE id = ?',
    args: [title, color, id],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM habits WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
