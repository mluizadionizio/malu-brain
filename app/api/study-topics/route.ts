import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET() {
  await initDb();
  // Return topics with total done sessions count
  const result = await db.execute({
    sql: `SELECT t.*, COUNT(CASE WHEN s.status = 'done' THEN 1 END) as done_count
          FROM study_topics t
          LEFT JOIN study_sessions s ON s.course_id = t.id
          WHERE t.active = 1
          GROUP BY t.id
          ORDER BY t.created_at ASC`,
    args: [],
  });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await initDb();
  const { title, color, total_modules } = await req.json();
  const result = await db.execute({
    sql: 'INSERT INTO study_topics (title, color, total_modules) VALUES (?, ?, ?)',
    args: [title, color ?? '#3b82f6', total_modules ?? null],
  });
  const row = await db.execute({ sql: 'SELECT * FROM study_topics WHERE id = ?', args: [result.lastInsertRowid!] });
  return NextResponse.json(row.rows[0], { status: 201 });
}
