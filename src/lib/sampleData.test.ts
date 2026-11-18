import { describe, it, expect } from 'vitest';
import { buildSampleData, LOCAL_USER_ID } from './sampleData';

let n = 0;
const id = () => `id-${++n}`;

describe('buildSampleData', () => {
  const now = new Date('2026-11-17T10:30:00');
  const data = buildSampleData(now, id);

  it('builds a full classroom with the local user among the staff', () => {
    expect(data.students.map(s => s.code)).toEqual(['JoSm', 'AvRo', 'MiTa', 'ElKa']);
    expect(data.abc_presets).toHaveLength(22);
    expect(data.goals.length).toBeGreaterThanOrEqual(5);
    expect(data.profiles.map(p => p.id)).toContain(LOCAL_USER_ID);
    expect(data.events.length).toBeGreaterThan(200);
  });

  it('never records in the future, and every reference resolves', () => {
    const ids = (rows: { id: string }[]) => new Set(rows.map(r => r.id));
    const students = ids(data.students), behaviors = ids(data.behaviors), sessions = ids(data.sessions);
    for (const e of data.events) {
      expect(new Date(e.occurred_at) <= now).toBe(true);
      expect(students.has(e.student_id)).toBe(true);
      expect(behaviors.has(e.behavior_id)).toBe(true);
      if (e.session_id) expect(sessions.has(e.session_id)).toBe(true);
    }
    for (const g of data.goals) for (const b of g.behavior_ids) expect(behaviors.has(b)).toBe(true);
  });

  it('follows the recording model: one trigger per behavior, ABC where required', () => {
    const byId = new Map(data.behaviors.map(b => [b.id, b]));
    for (const e of data.events) {
      const b = byId.get(e.behavior_id)!;
      expect(e.duration_seconds != null).toBe(b.track_duration);
      expect(e.rating != null).toBe(b.track_rating);
      if (b.requires_abc) expect(e.antecedent && e.consequence).toBeTruthy();
    }
  });

  it('shows challenging behavior trending down over the period', () => {
    const aggression = data.behaviors.find(b => b.name === 'Aggression')!;
    const times = data.events.filter(e => e.behavior_id === aggression.id).map(e => +new Date(e.occurred_at));
    const mid = (Math.min(...times) + +now) / 2;
    expect(times.filter(t => t < mid).length).toBeGreaterThan(times.filter(t => t >= mid).length);
  });

  it('is deterministic for a given seed', () => {
    const a = buildSampleData(now, id, 7), b = buildSampleData(now, id, 7);
    expect(a.events.map(e => e.occurred_at)).toEqual(b.events.map(e => e.occurred_at));
  });
});
