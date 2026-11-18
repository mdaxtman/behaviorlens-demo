import {
  abcPatterns, activityComparison, dailyCounts, dayKey, goalCurrent, inRange,
  trendDirection, type DateRange,
} from './analytics';
import type {
  Behavior, BehaviorEvent, Goal, GoalEntry, Session, Student,
} from './types';

export type DocKind = 'iep' | 'bip' | 'progress';

export interface PromptInput {
  student: Student;
  behaviors: Behavior[];
  events: BehaviorEvent[];
  goals: Goal[];
  goalEntries: GoalEntry[];
  sessions: Session[];
  range: DateRange;
  rangeLabel: string;
}

const ROLE: Record<DocKind, string> = {
  iep: 'You are an experienced special education teacher. Using the classroom data below, draft the behavioral portion of an IEP: present levels of performance (PLAAFP) for behavior, and 2-3 proposed measurable annual behavior goals with criteria, in professional IEP language.',
  bip: 'You are a board-certified behavior analyst (BCBA). Using the classroom data below, draft a Behavior Intervention Plan: hypothesized function of each behavior (based on the ABC patterns), prevention strategies, replacement behaviors to teach, and response strategies.',
  progress: 'You are a special education teacher writing an IEP goal progress report and report-card narrative for a parent audience. Using the data below, describe progress on each goal in warm, plain language, citing concrete numbers and trends.',
};

const OUTPUT_NOTES: Record<DocKind, string> = {
  iep: 'Structure the output with headings: "Present Levels" and "Proposed Goals". Goals must be measurable and time-bound.',
  bip: 'Structure the output with headings: "Hypothesized Function", "Prevention", "Teaching/Replacement", "Response Strategies". Tie each hypothesis to the antecedent/consequence data.',
  progress: 'Write 1-2 short paragraphs per goal, then a brief overall summary. Positive, specific, parent-friendly tone.',
};

function behaviorSection(b: Behavior, events: BehaviorEvent[], sessions: Session[], range: DateRange, rangeLabel: string): string {
  const mine = events.filter(e => e.behavior_id === b.id && inRange(e.occurred_at, range));
  const lines: string[] = [];
  lines.push(`### Behavior: ${b.name} (${b.category === 'challenging' ? 'challenging behavior' : 'skill/replacement behavior'}${b.active ? '' : '; no longer tracked'})`);
  if (b.description) lines.push(`Operational definition: ${b.description}`);
  if (mine.length === 0) {
    lines.push(`No recorded occurrences in the ${rangeLabel}.`);
    return lines.join('\n');
  }
  const daily = dailyCounts(mine, [b.id], range);
  const total = daily.reduce((a, d) => a + d.count, 0);
  // Average over days actually recorded for this student (any behavior), not calendar days —
  // untracked days would otherwise dilute the rate, and a recorded weekend/holiday day still counts.
  const recordedDays = new Set(
    events.filter(e => inRange(e.occurred_at, range)).map(e => dayKey(e.occurred_at)),
  );
  const denom = Math.max(1, recordedDays.size);
  const avg = Math.round((total / denom) * 10) / 10;
  lines.push(`Occurrences (${rangeLabel}): total ${total}, average ${avg}/recorded day across ${recordedDays.size} recorded day(s), trend ${trendDirection(daily.map(d => d.count))}.`);
  const secs = mine.reduce((a, e) => a + (e.duration_seconds ?? 0), 0);
  if (secs > 0) lines.push(`Total duration: ${Math.round(secs / 60)} minutes across ${mine.filter(e => e.duration_seconds != null).length} timed episodes.`);
  const ratings = mine.map(e => e.rating).filter((r): r is number => r != null);
  if (ratings.length > 0) {
    lines.push(`Average intensity: ${Math.round((ratings.reduce((a, b2) => a + b2, 0) / ratings.length) * 10) / 10}/5 over ${ratings.length} rated events.`);
  }
  const abc = abcPatterns(mine);
  if (abc.antecedents.length > 0) {
    lines.push(`Most common antecedents: ${abc.antecedents.slice(0, 5).map(a => `${a.label} (${a.count})`).join(', ')}.`);
  }
  if (abc.consequences.length > 0) {
    lines.push(`Most common consequences: ${abc.consequences.slice(0, 5).map(c => `${c.label} (${c.count})`).join(', ')}.`);
  }
  const acts = activityComparison(mine, sessions, range).filter(a => a.activity !== 'No session');
  if (acts.length > 0) {
    lines.push(`By activity: ${acts.map(a => `${a.activity} ${a.count}×${a.perHour != null ? ` (${a.perHour}/hr)` : ''}`).join(', ')}.`);
  }
  return lines.join('\n');
}

function goalSection(g: Goal, events: BehaviorEvent[], entries: GoalEntry[], behaviors: Behavior[], range: DateRange, rangeLabel: string): string {
  const lines: string[] = [];
  lines.push(`### Goal: ${g.title}`);
  if (g.description) lines.push(`IEP goal text: ${g.description}`);
  if (g.baseline) lines.push(`Baseline: ${g.baseline}`);
  if (g.target_date) lines.push(`Target date: ${g.target_date}`);
  if (g.mode === 'direct') {
    lines.push(`Measurement: direct trials, criterion ≥ ${g.criterion_percent ?? '?'}% of opportunities.`);
  } else {
    const names = g.behavior_ids
      .map(id => behaviors.find(b => b.id === id)?.name).filter(Boolean).join(', ');
    lines.push(`Measurement: linked to behavior data (${names}), criterion ${g.criterion_direction === 'at_least' ? '≥' : '≤'} ${g.criterion_value ?? '?'} ${g.criterion_metric ?? ''}.`);
  }
  const cur = goalCurrent(g, events, entries.filter(e => e.goal_id === g.id), range);
  lines.push(`Current performance (${rangeLabel}): ${cur.label}${cur.met != null ? cur.met ? ' — meeting criterion' : ' — not yet meeting criterion' : ''}.`);
  return lines.join('\n');
}

export function buildPrompt(kind: DocKind, input: PromptInput): string {
  const { student, behaviors, events, goals, goalEntries, sessions, range, rangeLabel } = input;
  const parts: string[] = [];
  parts.push(ROLE[kind]);
  parts.push(
    `PRIVACY: The student is identified only by the pseudonym code "${student.code}". ` +
    `In your output, refer to the student as [Student] (a placeholder the teacher will replace). ` +
    `Do not invent a name, gender, or diagnosis not present in the data.`,
  );
  const ctx: string[] = [`## Student context`, `Code: ${student.code}`];
  if (student.grade) ctx.push(`Grade: ${student.grade}`);
  if (student.notes) ctx.push(`Teacher notes: ${student.notes}`);
  ctx.push(`Data window: ${rangeLabel}.`);
  parts.push(ctx.join('\n'));
  // Active behaviors, plus any deactivated mid-period that still has data in the window —
  // otherwise retiring a behavior would silently erase its history from the report.
  const reported = behaviors.filter(b => b.active
    || events.some(e => e.behavior_id === b.id && inRange(e.occurred_at, range)));
  parts.push(['## Behavior data', ...reported
    .map(b => behaviorSection(b, events, sessions, range, rangeLabel))].join('\n\n'));
  if (goals.some(g => g.active)) {
    parts.push(['## IEP goals & progress', ...goals.filter(g => g.active)
      .map(g => goalSection(g, events, goalEntries, behaviors, range, rangeLabel))].join('\n\n'));
  }
  parts.push(`## Output instructions\n${OUTPUT_NOTES[kind]}`);
  return parts.join('\n\n');
}
