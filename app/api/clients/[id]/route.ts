import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const result = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
  if (!result.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = await req.json();
  const { name, niche, platform, monthly_budget, status, meta_link, google_link, next_action, tags } = body;

  await db.execute({
    sql: `UPDATE clients SET name=?, niche=?, platform=?, monthly_budget=?, status=?, meta_link=?, google_link=?, next_action=?, tags=? WHERE id=?`,
    args: [name, niche ?? null, platform ?? null, monthly_budget ?? null, status, meta_link ?? null, google_link ?? null, next_action ?? null, tags ?? '[]', id],
  });

  const result = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [id] });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM clients WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
