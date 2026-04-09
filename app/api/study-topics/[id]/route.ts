import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  const { title, color, total_modules } = await req.json();
  await db.execute({
    sql: 'UPDATE study_topics SET title=?, color=?, total_modules=? WHERE id=?',
    args: [title, color, total_modules ?? null, params.id],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await initDb();
  await db.execute({ sql: 'UPDATE study_topics SET active=0 WHERE id=?', args: [params.id] });
  return NextResponse.json({ ok: true });
}
