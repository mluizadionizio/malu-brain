import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { nowBrasilia } from '@/lib/reset';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = await req.json();

  if (Object.prototype.hasOwnProperty.call(body, 'completed')) {
    const taskResult = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
    const task = taskResult.rows[0] as unknown as { type: string } | undefined;
    const completing = Boolean(body.completed);

    if (completing) {
      const nowStr = nowBrasilia();
      if (task?.type === 'prioritaria') {
        await db.execute({
          sql: 'UPDATE tasks SET completed = 1, last_completed_at = ?, archived = 1 WHERE id = ?',
          args: [nowStr, id],
        });
      } else {
        await db.execute({
          sql: 'UPDATE tasks SET completed = 1, last_completed_at = ? WHERE id = ?',
          args: [nowStr, id],
        });
      }
    } else {
      await db.execute({
        sql: 'UPDATE tasks SET completed = 0, last_completed_at = NULL, archived = 0 WHERE id = ?',
        args: [id],
      });
    }
  } else {
    const { title, type } = body;
    await db.execute({
      sql: 'UPDATE tasks SET title = ?, type = ? WHERE id = ?',
      args: [title, type, id],
    });
  }

  const result = await db.execute({ sql: 'SELECT * FROM tasks WHERE id = ?', args: [id] });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM tasks WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
