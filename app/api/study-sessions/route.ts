import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await initDb();
  const date = req.nextUrl.searchParams.get('date');
  const monthParam = req.nextUrl.searchParams.get('month');

  // Month view: return dateMap for heatmap
  if (monthParam) {
    const [y, m] = monthParam.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const res = await db.execute({
      sql: 'SELECT date, status FROM study_sessions WHERE date >= ? AND date <= ?',
      args: [monthStart, monthEnd],
    });

    const dateMap: Record<string, { done: number; planned: number }> = {};
    for (const row of res.rows as any[]) {
      if (!dateMap[row.date]) dateMap[row.date] = { done: 0, planned: 0 };
      if (row.status === 'done') dateMap[row.date].done++;
      else dateMap[row.date].planned++;
    }

    return NextResponse.json({ dateMap, daysInMonth, year: y, month: m });
  }

  // Day view: return full sessions with course info
  if (date) {
    const res = await db.execute({
      sql: `SELECT s.id, s.course_id, s.date, s.module_label, s.duration_minutes, s.status,
                   t.title as course_title, t.color as course_color
            FROM study_sessions s
            JOIN study_topics t ON t.id = s.course_id
            WHERE s.date = ?
            ORDER BY s.created_at ASC`,
      args: [date],
    });
    return NextResponse.json(res.rows);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  await initDb();
  const { course_id, date, module_label, duration_minutes, status } = await req.json();
  const result = await db.execute({
    sql: 'INSERT INTO study_sessions (course_id, date, module_label, duration_minutes, status) VALUES (?, ?, ?, ?, ?)',
    args: [course_id, date, module_label ?? null, duration_minutes ?? null, status ?? 'done'],
  });
  const row = await db.execute({
    sql: `SELECT s.*, t.title as course_title, t.color as course_color
          FROM study_sessions s JOIN study_topics t ON t.id = s.course_id
          WHERE s.id = ?`,
    args: [result.lastInsertRowid!],
  });
  return NextResponse.json(row.rows[0], { status: 201 });
}
