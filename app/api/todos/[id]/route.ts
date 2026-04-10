import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { nowBrasilia } from '@/lib/reset';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const { completed } = await req.json();

  await db.execute({ sql: 'UPDATE todos SET completed = ? WHERE id = ?', args: [completed ? 1 : 0, id] });

  // Sync to linked task if this todo came from Tráfego
  const row = await db.execute({ sql: 'SELECT * FROM todos WHERE id = ?', args: [id] });
  const todo = row.rows[0] as any;
  if (todo?.task_id) {
    const nowStr = nowBrasilia();
    if (completed) {
      // Check if task is prioritaria (archives on completion)
      const taskRes = await db.execute({ sql: 'SELECT type FROM tasks WHERE id = ?', args: [todo.task_id] });
      const taskType = (taskRes.rows[0] as any)?.type;
      if (taskType === 'prioritaria') {
        await db.execute({
          sql: 'UPDATE tasks SET completed = 1, last_completed_at = ?, archived = 1 WHERE id = ?',
          args: [nowStr, todo.task_id],
        });
      } else {
        await db.execute({
          sql: 'UPDATE tasks SET completed = 1, last_completed_at = ? WHERE id = ?',
          args: [nowStr, todo.task_id],
        });
      }
    } else {
      await db.execute({
        sql: 'UPDATE tasks SET completed = 0, last_completed_at = NULL, archived = 0 WHERE id = ?',
        args: [todo.task_id],
      });
    }
  }

  const updated = await db.execute({
    sql: `SELECT t.*, c.name as client_name
          FROM todos t
          LEFT JOIN tasks tk ON tk.id = t.task_id
          LEFT JOIN clients c ON c.id = tk.client_id
          WHERE t.id = ?`,
    args: [id],
  });
  return NextResponse.json(updated.rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM todos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
