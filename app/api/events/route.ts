import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

type EventRow = {
  id: number;
  client_id: number | null;
  client_name: string | null;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  recurrence: string;
  created_at: string;
};

function expandRecurring(events: EventRow[], month: string): EventRow[] {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const result: EventRow[] = [];

  for (const ev of events) {
    if (ev.recurrence === 'none' || !ev.recurrence) {
      result.push(ev);
      continue;
    }
    const [ey, em, ed] = ev.date.split('-').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');

    if (ev.recurrence === 'weekly') {
      const originalDow = new Date(ey, em - 1, ed).getDay();
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(y, m - 1, d).getDay() === originalDow) {
          result.push({ ...ev, id: ev.id * 10000 + d, date: `${y}-${pad(m)}-${pad(d)}` });
        }
      }
    } else if (ev.recurrence === 'monthly') {
      if (ed <= daysInMonth) {
        result.push({ ...ev, date: `${y}-${pad(m)}-${pad(ed)}` });
      }
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
}

export async function GET(req: NextRequest) {
  await initDb();
  const month = req.nextUrl.searchParams.get('month');

  if (month) {
    const nonRecurringResult = await db.execute({
      sql: `SELECT e.*, c.name as client_name FROM events e LEFT JOIN clients c ON c.id = e.client_id WHERE e.date LIKE ? AND (e.recurrence = 'none' OR e.recurrence IS NULL) ORDER BY e.date ASC, e.time ASC`,
      args: [`${month}%`],
    });

    const recurringResult = await db.execute({
      sql: `SELECT e.*, c.name as client_name FROM events e LEFT JOIN clients c ON c.id = e.client_id WHERE e.recurrence != 'none' AND e.recurrence IS NOT NULL`,
      args: [],
    });

    const nonRecurring = nonRecurringResult.rows as unknown as EventRow[];
    const expanded = expandRecurring(recurringResult.rows as unknown as EventRow[], month);

    const seen = new Set<number>();
    const deduped = [...nonRecurring, ...expanded].filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    return NextResponse.json(deduped.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')));
  }

  const result = await db.execute({
    sql: `SELECT e.*, c.name as client_name FROM events e LEFT JOIN clients c ON c.id = e.client_id ORDER BY e.date ASC, e.time ASC`,
    args: [],
  });

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { client_id, title, description, date, time, recurrence } = body;

  if (!title?.trim() || !date) {
    return NextResponse.json({ error: 'title and date are required' }, { status: 400 });
  }

  const result = await db.execute({
    sql: `INSERT INTO events (client_id, title, description, date, time, recurrence) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [client_id || null, title.trim(), description || null, date, time || null, recurrence || 'none'],
  });

  const event = await db.execute({
    sql: `SELECT e.*, c.name as client_name FROM events e LEFT JOIN clients c ON c.id = e.client_id WHERE e.id = ?`,
    args: [result.lastInsertRowid!],
  });

  return NextResponse.json(event.rows[0], { status: 201 });
}
