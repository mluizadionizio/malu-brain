import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const clientId = req.nextUrl.searchParams.get('client_id');
  const result = await db.execute({
    sql: 'SELECT * FROM comments WHERE client_id = ? ORDER BY created_at DESC',
    args: [clientId],
  });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { client_id, content } = body;

  const result = await db.execute({
    sql: 'INSERT INTO comments (client_id, content) VALUES (?, ?)',
    args: [client_id, content],
  });

  const comment = await db.execute({
    sql: 'SELECT * FROM comments WHERE id = ?',
    args: [result.lastInsertRowid!],
  });

  return NextResponse.json(comment.rows[0], { status: 201 });
}
