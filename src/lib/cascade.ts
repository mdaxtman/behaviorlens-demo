import type { TableName } from './db';

type Rows = Partial<Record<TableName, { id: string; [k: string]: unknown }[]>>;

export interface CascadePlan {
  deletes: { table: TableName; id: string }[];
  /** Rows that survive but lose a reference (set to null). */
  updates: { table: TableName; row: { id: string; [k: string]: unknown } }[];
}

/**
 * What deleting one row implies, mirroring the foreign keys the app's original Postgres schema
 * enforced (`on delete cascade` / `on delete set null`). With no server, the app has to do it:
 * - student  -> its behaviors, goals and events (and, through them, goal entries)
 * - behavior -> its events
 * - goal     -> its goal entries
 * - session  -> events and goal entries keep existing, with session_id cleared
 */
export function planDelete(table: TableName, id: string, rows: Rows): CascadePlan {
  const plan: CascadePlan = { deletes: [], updates: [] };
  const seen = new Set<string>();
  const del = (t: TableName, rowId: string) => {
    const key = `${t}:${rowId}`;
    if (seen.has(key)) return;
    seen.add(key);
    plan.deletes.push({ table: t, id: rowId });
    const children = (child: TableName, fk: string) =>
      (rows[child] ?? []).filter(r => r[fk] === rowId).forEach(r => del(child, r.id));
    if (t === 'students') {
      children('behaviors', 'student_id');
      children('goals', 'student_id');
      children('events', 'student_id');
    } else if (t === 'behaviors') {
      children('events', 'behavior_id');
    } else if (t === 'goals') {
      children('goal_entries', 'goal_id');
    }
  };
  del(table, id);

  if (table === 'sessions') {
    for (const t of ['events', 'goal_entries'] as const) {
      for (const r of rows[t] ?? []) {
        if (r.session_id === id) plan.updates.push({ table: t, row: { ...r, session_id: null } });
      }
    }
  }
  return plan;
}
