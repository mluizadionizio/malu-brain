import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { getDailyCutoff } from '@/lib/reset';

export async function GET() {
  await initDb();
  const cutoff = getDailyCutoff();

  const result = await db.execute({
    sql: `
      SELECT
        c.*,
        (SELECT content FROM comments WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_comment,
        (SELECT created_at FROM comments WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_comment_at,
        (SELECT json_group_array(json_object(
          'id', t.id,
          'title', t.title,
          'completed', CASE WHEN (t.last_completed_at IS NULL OR t.last_completed_at < ?) THEN 0 ELSE 1 END
        ))
        FROM tasks t
        WHERE t.client_id = c.id AND t.type = 'diaria' AND t.archived = 0
        ORDER BY t.created_at ASC) AS daily_tasks_json,
        (SELECT json_group_array(json_object(
          'id', t.id,
          'title', t.title
        ))
        FROM tasks t
        WHERE t.client_id = c.id AND t.type = 'prioritaria' AND t.archived = 0
        ORDER BY t.created_at ASC) AS priority_tasks_json
      FROM clients c
      ORDER BY name ASC
    `,
    args: [cutoff],
  });

  const clients = result.rows.map((c: any) => ({
    ...c,
    daily_tasks: c.daily_tasks_json ? JSON.parse(c.daily_tasks_json) : [],
    daily_tasks_json: undefined,
    priority_tasks: c.priority_tasks_json ? JSON.parse(c.priority_tasks_json) : [],
    priority_tasks_json: undefined,
  }));

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { name, niche, platform, monthly_budget, status, meta_link, google_link } = body;

  const result = await db.execute({
    sql: `INSERT INTO clients (name, niche, platform, monthly_budget, status, meta_link, google_link, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, '[]')`,
    args: [name, niche ?? null, platform ?? null, monthly_budget ?? null, status || 'ativo', meta_link ?? null, google_link ?? null],
  });

  const client = await db.execute({
    sql: 'SELECT * FROM clients WHERE id = ?',
    args: [result.lastInsertRowid!],
  });

  return NextResponse.json(client.rows[0], { status: 201 });
}
