import type { BehaviorEvent } from './types';

/** Events for the log views: optionally one student's, newest first, optionally capped. */
export function selectEvents(
  events: BehaviorEvent[], opts: { studentId?: string | null; limit?: number } = {},
): BehaviorEvent[] {
  const out = (opts.studentId ? events.filter(e => e.student_id === opts.studentId) : [...events])
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  return opts.limit != null ? out.slice(0, opts.limit) : out;
}
