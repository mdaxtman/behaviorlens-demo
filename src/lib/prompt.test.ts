import { describe, expect, it } from 'vitest';
import { lastNDays } from './analytics';
import { buildPrompt, type PromptInput } from './prompt';
import type { Behavior, BehaviorEvent, Goal, Student } from './types';

const student: Student = {
  id: 's1', code: 'JoSm', grade: '3', notes: null, color: '#fff', active: true, created_at: '',
};
const behavior: Behavior = {
  id: 'b1', student_id: 's1', name: 'Aggression', description: 'Hitting or kicking others',
  category: 'challenging', track_frequency: true, track_duration: false, track_rating: true,
  requires_abc: true, active: true, created_at: '',
};
const goal: Goal = {
  id: 'g1', student_id: 's1', title: 'Fewer aggressions', description: 'Will reduce aggression to ≤2/day',
  mode: 'linked', behavior_ids: ['b1'], criterion_direction: 'at_most', criterion_value: 2,
  criterion_metric: 'count_per_day', criterion_percent: null, baseline: '6/day in May',
  target_date: '2026-12-01', active: true, created_at: '',
};
const events: BehaviorEvent[] = [{
  id: 'e1', student_id: 's1', behavior_id: 'b1', session_id: null,
  occurred_at: '2026-07-01T10:00:00', count: 3, duration_seconds: null, rating: 4,
  antecedent: 'Transition', consequence: 'Attention given', setting: 'Classroom',
  note: null, recorder: 'MA', created_at: '',
}];

const input: PromptInput = {
  student, behaviors: [behavior], events, goals: [goal], goalEntries: [], sessions: [],
  range: lastNDays(14, new Date('2026-07-03T12:00:00')), rangeLabel: 'last 14 days',
};

describe('buildPrompt', () => {
  it('includes privacy placeholder instruction', () => {
    const p = buildPrompt('iep', input);
    expect(p).toContain('[Student]');
    expect(p).toContain('JoSm');
  });

  it('includes behavior definition and computed stats', () => {
    const p = buildPrompt('bip', input);
    expect(p).toContain('Aggression');
    expect(p).toContain('Hitting or kicking others');
    expect(p).toContain('total 3');
    expect(p).toContain('Transition (1)');
  });

  it('includes goal criterion and baseline', () => {
    const p = buildPrompt('progress', input);
    expect(p).toContain('Fewer aggressions');
    expect(p).toContain('6/day in May');
    expect(p).toContain('2026-12-01');
  });

  it('varies role framing by kind', () => {
    expect(buildPrompt('iep', input)).toContain('present levels');
    expect(buildPrompt('bip', input)).toContain('Behavior Intervention Plan');
    expect(buildPrompt('progress', input)).toContain('progress report');
  });

  it('keeps a deactivated behavior that has data in the window, and drops one that has none', () => {
    const retired = { ...behavior, active: false };
    const idle: Behavior = { ...behavior, id: 'b2', name: 'Elopement', active: false };
    const p = buildPrompt('bip', { ...input, behaviors: [retired, idle] });
    expect(p).toContain('Aggression (challenging behavior; no longer tracked)');
    expect(p).toContain('total 3');
    expect(p).not.toContain('Elopement');
  });
});
