import { describe, expect, it } from 'vitest';
import { selectEvents } from './eventLog';
import type { BehaviorEvent } from './types';

const ev = (id: string, student_id: string, occurred_at: string) =>
  ({ id, student_id, occurred_at } as BehaviorEvent);

const events = [
  ev('a', 's1', '2026-10-01T09:00:00Z'),
  ev('b', 's2', '2026-10-01T10:00:00Z'),
  ev('c', 's1', '2026-10-01T11:00:00Z'),
  ev('d', 's1', '2026-09-30T08:00:00Z'),
];

describe('selectEvents', () => {
  it('returns all students, newest first, when no student is given', () => {
    expect(selectEvents(events).map(e => e.id)).toEqual(['c', 'b', 'a', 'd']);
  });
  it("filters to one student's entries", () => {
    expect(selectEvents(events, { studentId: 's1' }).map(e => e.id)).toEqual(['c', 'a', 'd']);
  });
  it('applies the limit after filtering and sorting', () => {
    expect(selectEvents(events, { studentId: 's1', limit: 2 }).map(e => e.id)).toEqual(['c', 'a']);
  });
  it('does not mutate the input array', () => {
    const copy = [...events];
    selectEvents(events, { limit: 1 });
    expect(events).toEqual(copy);
  });
});
