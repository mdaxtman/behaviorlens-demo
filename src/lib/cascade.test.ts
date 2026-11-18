import { describe, it, expect } from 'vitest';
import { planDelete } from './cascade';

const rows = {
  students: [{ id: 's1' }, { id: 's2' }],
  behaviors: [{ id: 'b1', student_id: 's1' }, { id: 'b2', student_id: 's2' }],
  goals: [{ id: 'g1', student_id: 's1' }],
  goal_entries: [{ id: 'ge1', goal_id: 'g1', session_id: 'x1' }],
  events: [
    { id: 'e1', student_id: 's1', behavior_id: 'b1', session_id: 'x1' },
    { id: 'e2', student_id: 's2', behavior_id: 'b2', session_id: 'x1' },
  ],
  sessions: [{ id: 'x1' }],
};

const keys = (p: ReturnType<typeof planDelete>) => p.deletes.map(d => `${d.table}:${d.id}`).sort();

describe('planDelete', () => {
  it('deleting a student removes everything that belongs to them, once each', () => {
    expect(keys(planDelete('students', 's1', rows))).toEqual(
      ['behaviors:b1', 'events:e1', 'goal_entries:ge1', 'goals:g1', 'students:s1']);
  });

  it('deleting a behavior removes only its events', () => {
    expect(keys(planDelete('behaviors', 'b2', rows))).toEqual(['behaviors:b2', 'events:e2']);
  });

  it('deleting a session keeps its entries but clears their session', () => {
    const p = planDelete('sessions', 'x1', rows);
    expect(keys(p)).toEqual(['sessions:x1']);
    expect(p.updates.map(u => [u.table, u.row.id, u.row.session_id])).toEqual([
      ['events', 'e1', null], ['events', 'e2', null], ['goal_entries', 'ge1', null],
    ]);
  });
});
