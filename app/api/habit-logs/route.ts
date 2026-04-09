import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  await initDb();
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const monthParam = req.nextUrl.searchParams.get('month'); // "YYYY-MM"

  const habitsRes = await db.execute({ sql: 'SELECT * FROM habits WHERE active = 1 ORDER BY created_at ASC', args: [] });
  const habits = habitsRes.rows as unknown as { id: number; title: string; color: string }[];

  // Month view: return all logs for the month grouped by day
  if (monthParam) {
    const [y, m] = monthParam.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const logsRes = await db.execute({
      sql: 'SELECT habit_id, date, completed FROM habit_logs WHERE date >= ? AND date <= ? ORDER BY date ASC',
      args: [monthStart, monthEnd],
    });

    // Build map: { [date]: { [habit_id]: completed } }
    const logMap: Record<string, Record<number, number>> = {};
    for (const row of logsRes.rows as any[]) {
      if (!logMap[row.date]) logMap[row.date] = {};
      logMap[row.date][row.habit_id] = Number(row.completed);
    }

    return NextResponse.json({ habits, logMap, daysInMonth, year: y, month: m });
  }

  // Day view: return habits with today status + last 30 days + streak
  const last30: string[] = [];
  for (let i = 29; i >= 0; i--) last30.push(addDays(date, -i));

  const result = await Promise.all(habits.map(async (h) => {
    const todayRes = await db.execute({
      sql: 'SELECT completed FROM habit_logs WHERE habit_id = ? AND date = ?',
      args: [h.id, date],
    });
    const completed_today = todayRes.rows[0] ? Number((todayRes.rows[0] as any).completed) : 0;

    const logsRes = await db.execute({
      sql: 'SELECT date, completed FROM habit_logs WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
      args: [h.id, last30[0], date],
    });
    const logMap: Record<string, number> = {};
    for (const row of logsRes.rows) {
      logMap[(row as any).date] = Number((row as any).completed);
    }
    const last_30 = last30.map(d => ({ date: d, completed: logMap[d] ?? 0 }));

    let streak = 0;
    for (let i = last_30.length - 1; i >= 0; i--) {
      if (last_30[i].completed) streak++;
      else break;
    }

    return { ...h, completed_today, streak, last_30 };
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  await initDb();
  const { habit_id, date, completed } = await req.json();
  await db.execute({
    sql: `INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, ?)
          ON CONFLICT(habit_id, date) DO UPDATE SET completed = excluded.completed`,
    args: [habit_id, date, completed ? 1 : 0],
  });
  return NextResponse.json({ ok: true });
}
