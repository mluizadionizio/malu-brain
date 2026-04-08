import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getDailyCutoff } from '@/lib/reset';

export async function GET(req: NextRequest) {
  await initDb();
  const clientId = req.nextUrl.searchParams.get('client_id');
  const cutoff = getDailyCutoff();

  const result = await db.execute({
    sql: `
      SELECT *,
        CASE
          WHEN type = 'diaria' AND (last_completed_at IS NULL OR last_completed_at < ?)
          THEN 0
          ELSE completed
        END as completed
      FROM tasks
      WHERE client_id = ?
      ORDER BY archived ASC, type DESC, created_at ASC
    `,
    args: [cutoff, clientId],
  });

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { client_id, title, type } = body;

  const result = await db.execute({
    sql: `INSERT INTO tasks (client_id, title, type) VALUES (?, ?, ?)`,
    args: [client_id, title, type || 'diaria'],
  });

  const task = await db.execute({
    sql: 'SELECT * FROM tasks WHERE id = ?',
    args: [result.lastInsertRowid!],
  });

  return NextResponse.json(task.rows[0], { status: 201 });
}
