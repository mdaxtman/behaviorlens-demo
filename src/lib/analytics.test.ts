import { describe, expect, it } from 'vitest';
import {
  abcPatterns, activityComparison, dailyCounts, dailyDurationMinutes,
  directGoalSeries, goalCurrent, heatmapHours, hourDayHeatmap, lastNDays, linkedGoalSeries, trendDirection,
} from './analytics';
import type { BehaviorEvent, Goal, GoalEntry, Session } from './types';

function ev(partial: Partial<BehaviorEvent>): BehaviorEvent {
  return {
    id: crypto.randomUUID(), student_id: 's1', behavior_id: 'b1', session_id: null,
    occurred_at: '2026-07-01T10:00:00', count: 1, duration_seconds: null, rating: null,
    antecedent: null, consequence: null, setting: null, note: null, recorder: null,
    created_at: '2026-07-01T10:00:00', ...partial,
  };
}

const range = lastNDays(3, new Date('2026-07-03T12:00:00'));

describe('dailyCounts', () => {
  it('zero-fills days and filters by behavior', () => {
    const events = [
      ev({ occurred_at: '2026-07-01T09:00:00', count: 2 }),
      ev({ occurred_at: '2026-07-01T14:00:00' }),
      ev({ occurred_at: '2026-07-03T09:00:00' }),
      ev({ occurred_at: '2026-07-02T09:00:00', behavior_id: 'other' }),
      ev({ occurred_at: '2026-06-20T09:00:00' }), // out of range
    ];
    expect(dailyCounts(events, ['b1'], range)).toEqual([
      { date: '2026-07-01', count: 3 },
      { date: '2026-07-02', count: 0 },
      { date: '2026-07-03', count: 1 },
    ]);
  });
});

describe('dailyDurationMinutes', () => {
  it('sums seconds into minutes per day', () => {
    const events = [
      ev({ occurred_at: '2026-07-02T09:00:00', duration_seconds: 90 }),
      ev({ occurred_at: '2026-07-02T10:00:00', duration_seconds: 30 }),
    ];
    const rows = dailyDurationMinutes(events, ['b1'], range);
    expect(rows.find(r => r.date === '2026-07-02')?.minutes).toBe(2);
  });
});

describe('abcPatterns', () => {
  it('counts and sorts antecedents/consequences desc', () => {
    const events = [
      ev({ antecedent: 'Transition', consequence: 'Attention given' }),
      ev({ antecedent: 'Transition', consequence: 'Redirected' }),
      ev({ antecedent: 'Demand placed' }),
    ];
    const p = abcPatterns(events);
    expect(p.antecedents[0]).toEqual({ label: 'Transition', count: 2 });
    expect(p.antecedents[1]).toEqual({ label: 'Demand placed', count: 1 });
    expect(p.consequences).toHaveLength(2);
  });
});

describe('hourDayHeatmap', () => {
  it('places counts at [day][hour]', () => {
    // 2026-07-01 is a Wednesday (getDay() === 3)
    const grid = hourDayHeatmap([ev({ occurred_at: '2026-07-01T10:30:00', count: 2 })]);
    expect(grid[3][10]).toBe(2);
    expect(grid[0][0]).toBe(0);
  });
});

describe('activityComparison', () => {
  it('computes events per hour by session activity', () => {
    const sessions: Session[] = [
      { id: 'ss1', activity: 'Math', setting: null, started_at: '2026-07-01T09:00:00',
        ended_at: '2026-07-01T10:00:00', note: null, created_at: '' },
      { id: 'ss2', activity: 'Math', setting: null, started_at: '2026-07-02T09:00:00',
        ended_at: '2026-07-02T10:00:00', note: null, created_at: '' },
    ];
    const events = [
      ev({ session_id: 'ss1', occurred_at: '2026-07-01T09:10:00', count: 3 }),
      ev({ session_id: 'ss2', occurred_at: '2026-07-02T09:10:00' }),
      ev({ session_id: null }),
    ];
    const rows = activityComparison(events, sessions);
    const math = rows.find(r => r.activity === 'Math')!;
    expect(math.count).toBe(4);
    expect(math.perHour).toBe(2);
    expect(rows.find(r => r.activity === 'No session')?.perHour).toBeNull();
  });

  it('with a range, only counts observed hours from sessions overlapping it', () => {
    // 2026-07-02 is a Thursday; restrict the range to that single day.
    const dayRange = lastNDays(1, new Date('2026-07-02T12:00:00'));
    const sessions: Session[] = [
      { id: 'ss1', activity: 'Math', setting: null, started_at: '2026-07-01T09:00:00',
        ended_at: '2026-07-01T10:00:00', note: null, created_at: '' }, // outside dayRange
      { id: 'ss2', activity: 'Math', setting: null, started_at: '2026-07-02T09:00:00',
        ended_at: '2026-07-02T11:00:00', note: null, created_at: '' }, // inside dayRange, 2 hrs
    ];
    const events = [ev({ session_id: 'ss2', occurred_at: '2026-07-02T09:10:00', count: 4 })];
    const rows = activityComparison(events, sessions, dayRange);
    const math = rows.find(r => r.activity === 'Math')!;
    expect(math.count).toBe(4);
    expect(math.perHour).toBe(2); // 4 events / 2 hrs from ss2 only — ss1 excluded by range
  });
});

describe('trendDirection', () => {
  it('detects increase, decrease, stable', () => {
    expect(trendDirection([1, 1, 4, 5])).toBe('increasing');
    expect(trendDirection([5, 4, 1, 1])).toBe('decreasing');
    expect(trendDirection([2, 2, 2, 2])).toBe('stable');
    expect(trendDirection([])).toBe('stable');
  });
});

const linkedGoal: Goal = {
  id: 'g1', student_id: 's1', title: 'Fewer aggressions', description: null,
  mode: 'linked', behavior_ids: ['b1'], criterion_direction: 'at_most',
  criterion_value: 2, criterion_metric: 'count_per_day', criterion_percent: null,
  baseline: null, target_date: null, active: true, created_at: '',
};

describe('goals', () => {
  it('linkedGoalSeries returns daily metric values', () => {
    const events = [ev({ occurred_at: '2026-07-01T09:00:00', count: 3 })];
    const series = linkedGoalSeries(linkedGoal, events, range);
    expect(series[0]).toEqual({ date: '2026-07-01', value: 3 });
    expect(series[1]).toEqual({ date: '2026-07-02', value: 0 });
  });

  it('goalCurrent for linked at_most compares daily average', () => {
    const events = [
      ev({ occurred_at: '2026-07-01T09:00:00', count: 3 }),
      ev({ occurred_at: '2026-07-02T09:00:00', count: 3 }),
      ev({ occurred_at: '2026-07-03T09:00:00', count: 3 }),
    ];
    const cur = goalCurrent(linkedGoal, events, [], range);
    expect(cur.value).toBe(3);
    expect(cur.met).toBe(false);
    expect(cur.label).toContain('≤ 2');
  });

  it('directGoalSeries and goalCurrent compute percentages', () => {
    const entries: GoalEntry[] = [
      { id: 'e1', goal_id: 'g2', session_id: null, occurred_at: '2026-07-01T09:00:00',
        successes: 4, opportunities: 5, note: null, created_at: '', device_id: null },
      { id: 'e2', goal_id: 'g2', session_id: null, occurred_at: '2026-07-02T09:00:00',
        successes: 1, opportunities: 5, note: null, created_at: '', device_id: null },
    ];
    const directGoal: Goal = { ...linkedGoal, id: 'g2', mode: 'direct', behavior_ids: [],
      criterion_direction: null, criterion_value: null, criterion_metric: null, criterion_percent: 80 };
    const series = directGoalSeries(entries, range);
    expect(series[0].pct).toBe(80);
    expect(series[2].pct).toBeNull();
    const cur = goalCurrent(directGoal, [], entries, range);
    expect(cur.value).toBe(50); // 5 of 10 opportunities
    expect(cur.met).toBe(false);
  });

  it('goalCurrent (linked) averages over recorded days, not zero-filled empty days', () => {
    // Mon 2026-06-29 .. Sun 2026-07-05 — a 7-day range containing one full weekend.
    // Events on 5 days (count 2 each); the other 2 days were never recorded.
    const weekRange = lastNDays(7, new Date('2026-07-05T12:00:00'));
    const events = [
      ev({ occurred_at: '2026-06-29T09:00:00', count: 2 }),
      ev({ occurred_at: '2026-06-30T09:00:00', count: 2 }),
      ev({ occurred_at: '2026-07-01T09:00:00', count: 2 }),
      ev({ occurred_at: '2026-07-02T09:00:00', count: 2 }),
      ev({ occurred_at: '2026-07-03T09:00:00', count: 2 }),
    ];
    const cur = goalCurrent(linkedGoal, events, [], weekRange);
    // 10 events across 5 recorded days -> avg 2, not 10/7 (~1.4) diluted by the 2 empty days.
    expect(cur.value).toBe(2);
    expect(cur.label).toContain('5 recorded days');
  });

  it('goalCurrent (linked) counts weekend-recorded events instead of dropping them (regression)', () => {
    // 2026-08-15 is a Saturday. Three aggressions that day against a ≤1/day cap.
    // The old "school-day only" logic discarded all of these, reporting 0/day "on track".
    const weekendRange = lastNDays(7, new Date('2026-08-15T12:00:00'));
    const events = [
      ev({ occurred_at: '2026-08-15T10:00:00', count: 1 }),
      ev({ occurred_at: '2026-08-15T11:00:00', count: 1 }),
      ev({ occurred_at: '2026-08-15T12:00:00', count: 1 }),
    ];
    const capOne: Goal = { ...linkedGoal, criterion_value: 1 };
    const cur = goalCurrent(capOne, events, [], weekendRange);
    expect(cur.value).toBe(3); // one recorded day with 3 events, not 0
    expect(cur.met).toBe(false); // 3 exceeds the ≤1 cap
  });
});

describe('heatmapHours', () => {
  const grid = () => Array.from({ length: 7 }, () => Array<number>(24).fill(0));

  it('defaults to the 7:00–16:00 school day', () => {
    expect(heatmapHours(grid())).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it('widens to include early and late events', () => {
    const g = grid();
    g[1][6] = 2;
    g[3][18] = 1;
    const hours = heatmapHours(g);
    expect(hours[0]).toBe(6);
    expect(hours[hours.length - 1]).toBe(18);
  });
});
