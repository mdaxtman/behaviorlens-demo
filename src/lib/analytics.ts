import type { BehaviorEvent, Goal, GoalEntry, Session } from './types';

export interface DateRange { start: Date; end: Date }
export interface LabelCount { label: string; count: number }

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dayKey(iso: string): string {
  return keyOf(new Date(iso));
}
export function lastNDays(n: number, today: Date = new Date()): DateRange {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1));
  return { start, end };
}
export function eachDay(range: DateRange): string[] {
  const days: string[] = [];
  const d = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  while (d <= range.end) {
    days.push(keyOf(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}
export function inRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso);
  return t >= range.start && t <= range.end;
}
function filtered(events: BehaviorEvent[], behaviorIds: string[], range: DateRange): BehaviorEvent[] {
  const ids = new Set(behaviorIds);
  return events.filter(e => ids.has(e.behavior_id) && inRange(e.occurred_at, range));
}

export function dailyCounts(events: BehaviorEvent[], behaviorIds: string[], range: DateRange) {
  const byDay = new Map<string, number>();
  for (const e of filtered(events, behaviorIds, range)) {
    const k = dayKey(e.occurred_at);
    byDay.set(k, (byDay.get(k) ?? 0) + e.count);
  }
  return eachDay(range).map(date => ({ date, count: byDay.get(date) ?? 0 }));
}

export function dailyDurationMinutes(events: BehaviorEvent[], behaviorIds: string[], range: DateRange) {
  const byDay = new Map<string, number>();
  for (const e of filtered(events, behaviorIds, range)) {
    if (e.duration_seconds == null) continue;
    const k = dayKey(e.occurred_at);
    byDay.set(k, (byDay.get(k) ?? 0) + e.duration_seconds);
  }
  return eachDay(range).map(date => ({
    date, minutes: Math.round(((byDay.get(date) ?? 0) / 60) * 10) / 10,
  }));
}

export function dailyAvgRating(events: BehaviorEvent[], behaviorIds: string[], range: DateRange) {
  const byDay = new Map<string, number[]>();
  for (const e of filtered(events, behaviorIds, range)) {
    if (e.rating == null) continue;
    const k = dayKey(e.occurred_at);
    byDay.set(k, [...(byDay.get(k) ?? []), e.rating]);
  }
  return eachDay(range).map(date => {
    const ratings = byDay.get(date);
    return {
      date,
      rating: ratings?.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    };
  });
}

function tally(values: (string | null)[]): LabelCount[] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function abcPatterns(events: BehaviorEvent[]) {
  return {
    antecedents: tally(events.map(e => e.antecedent)),
    consequences: tally(events.map(e => e.consequence)),
  };
}

export function hourDayHeatmap(events: BehaviorEvent[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const e of events) {
    const d = new Date(e.occurred_at);
    grid[d.getDay()][d.getHours()] += e.count;
  }
  return grid;
}

/**
 * Hours (columns) for the heatmap: the 7:00–16:59 school day, widened to include any hour that
 * has events, so an early bus or after-school entry is shown rather than silently cut off.
 */
export function heatmapHours(grid: number[][]): number[] {
  const used = [...Array(24).keys()].filter(h => grid.some(row => row[h] > 0));
  const from = Math.min(7, ...used);
  const to = Math.max(16, ...used);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayOfWeekCounts(events: BehaviorEvent[]) {
  const counts = Array<number>(7).fill(0);
  for (const e of events) counts[new Date(e.occurred_at).getDay()] += e.count;
  return DAY_NAMES.map((day, i) => ({ day, count: counts[i] }));
}

export function activityComparison(events: BehaviorEvent[], sessions: Session[], range?: DateRange) {
  const sessionById = new Map(sessions.map(s => [s.id, s]));
  const byActivity = new Map<string, number>();
  for (const e of events) {
    const activity = (e.session_id && sessionById.get(e.session_id)?.activity) || 'No session';
    byActivity.set(activity, (byActivity.get(activity) ?? 0) + e.count);
  }
  // Observed hours per activity = total duration of ended sessions with that activity.
  // When `range` is given, only sessions overlapping it count — callers already filter the
  // numerator `events` to the same range, so the denominator must match or perHour skews.
  const hoursByActivity = new Map<string, number>();
  for (const s of sessions) {
    if (!s.ended_at) continue;
    if (range && !(new Date(s.started_at) <= range.end && new Date(s.ended_at) >= range.start)) continue;
    const hrs = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 3_600_000;
    hoursByActivity.set(s.activity, (hoursByActivity.get(s.activity) ?? 0) + hrs);
  }
  return [...byActivity.entries()]
    .map(([activity, count]) => {
      const hrs = hoursByActivity.get(activity) ?? 0;
      return { activity, count, perHour: hrs > 0 ? Math.round((count / hrs) * 10) / 10 : null };
    })
    .sort((a, b) => b.count - a.count);
}

export function trendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  const mid = Math.floor(values.length / 2);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const first = mean(values.slice(0, mid));
  const second = mean(values.slice(mid));
  if (second > first * 1.15 && second - first > 0.1) return 'increasing';
  if (second < first * 0.85 && first - second > 0.1) return 'decreasing';
  return 'stable';
}

const METRIC_LABEL: Record<string, string> = {
  count_per_day: '/day', minutes_per_day: ' min/day', avg_rating: ' avg intensity',
};

export function linkedGoalSeries(goal: Goal, events: BehaviorEvent[], range: DateRange) {
  if (goal.criterion_metric === 'minutes_per_day') {
    return dailyDurationMinutes(events, goal.behavior_ids, range)
      .map(r => ({ date: r.date, value: r.minutes as number | null }));
  }
  if (goal.criterion_metric === 'avg_rating') {
    return dailyAvgRating(events, goal.behavior_ids, range)
      .map(r => ({ date: r.date, value: r.rating }));
  }
  return dailyCounts(events, goal.behavior_ids, range)
    .map(r => ({ date: r.date, value: r.count as number | null }));
}

export function directGoalSeries(entries: GoalEntry[], range: DateRange) {
  const byDay = new Map<string, { s: number; o: number }>();
  for (const e of entries) {
    if (!inRange(e.occurred_at, range)) continue;
    const k = dayKey(e.occurred_at);
    const agg = byDay.get(k) ?? { s: 0, o: 0 };
    agg.s += e.successes;
    agg.o += e.opportunities;
    byDay.set(k, agg);
  }
  return eachDay(range).map(date => {
    const agg = byDay.get(date);
    return { date, pct: agg && agg.o > 0 ? Math.round((agg.s / agg.o) * 100) : null };
  });
}

export function goalCurrent(goal: Goal, events: BehaviorEvent[], entries: GoalEntry[], range: DateRange) {
  if (goal.mode === 'direct') {
    const mine = entries.filter(e => e.goal_id === goal.id && inRange(e.occurred_at, range));
    const opportunities = mine.reduce((a, e) => a + e.opportunities, 0);
    const successes = mine.reduce((a, e) => a + e.successes, 0);
    if (opportunities === 0) return { value: null, met: null, label: 'No trials yet' };
    const value = Math.round((successes / opportunities) * 100);
    const met = goal.criterion_percent != null ? value >= goal.criterion_percent : null;
    return { value, met, label: `${value}% of opportunities vs ≥ ${goal.criterion_percent ?? '?'}%` };
  }
  // Average over days that were actually recorded for this student (any behavior), so a
  // recorded day is never dropped (a weekend/holiday entry still counts) and days that were
  // never tracked don't dilute the rate by masquerading as quiet zero days.
  const recordedDays = new Set(
    events.filter(e => inRange(e.occurred_at, range)).map(e => dayKey(e.occurred_at)),
  );
  const series = linkedGoalSeries(goal, events, range);
  const values = series
    .filter(r => recordedDays.has(r.date))
    .map(r => r.value)
    .filter((v): v is number => v != null);
  if (values.length === 0) return { value: null, met: null, label: 'No data yet' };
  const value = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  const dir = goal.criterion_direction === 'at_least' ? '≥' : '≤';
  const met = goal.criterion_value == null ? null
    : goal.criterion_direction === 'at_least' ? value >= goal.criterion_value : value <= goal.criterion_value;
  const unit = METRIC_LABEL[goal.criterion_metric ?? 'count_per_day'];
  const n = values.length;
  return {
    value, met,
    label: `avg ${value}${unit} vs ${dir} ${goal.criterion_value ?? '?'} over ${n} recorded day${n === 1 ? '' : 's'}`,
  };
}
