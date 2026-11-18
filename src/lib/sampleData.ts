import type {
  AbcPreset, Behavior, BehaviorEvent, Goal, GoalEntry, Profile, Session, Student,
} from './types';

/** The one person using this browser. Recorded entries are attributed to this profile. */
export const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001';

export interface SampleData {
  students: Student[]; behaviors: Behavior[]; abc_presets: AbcPreset[]; sessions: Session[];
  events: BehaviorEvent[]; goals: Goal[]; goal_entries: GoalEntry[]; profiles: Profile[];
}

const PRESETS: [AbcPreset['kind'], string][] = [
  ['antecedent', 'Demand placed'], ['antecedent', 'Transition'], ['antecedent', 'Denied access/item'],
  ['antecedent', 'Peer conflict'], ['antecedent', 'Attention to others'], ['antecedent', 'Unstructured time'],
  ['antecedent', 'Task difficulty'], ['antecedent', 'Change in routine'],
  ['consequence', 'Attention given'], ['consequence', 'Escape/break provided'], ['consequence', 'Item/activity given'],
  ['consequence', 'Redirected'], ['consequence', 'Planned ignoring'], ['consequence', 'Removed from area'],
  ['consequence', 'Peer reaction'],
  ['setting', 'Classroom'], ['setting', 'Hallway'], ['setting', 'Cafeteria'], ['setting', 'Recess'],
  ['setting', 'Specials'], ['setting', 'Small group'], ['setting', 'Bus'],
];

/** The default ABC chips every classroom starts with. */
export function defaultPresets(createdAt: string, id: () => string): AbcPreset[] {
  const order: Record<string, number> = {};
  return PRESETS.map(([kind, label]) => ({
    id: id(), kind, label, sort_order: (order[kind] = (order[kind] ?? 0) + 1), active: true, created_at: createdAt,
  }));
}

/** Small seeded PRNG so the sample data has the same shape every time (and in tests). */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BehaviorSpec {
  name: string; description: string; category: Behavior['category'];
  track: 'count' | 'duration' | 'rating'; abc: boolean;
  /** Expected occurrences per school day at the start and the end of the period (the trend). */
  rate: [number, number];
  /** Typical episode length in seconds (duration behaviors). */
  seconds?: number;
  antecedents?: [string, number][]; consequences?: [string, number][];
  goal?: Omit<Goal, 'id' | 'student_id' | 'behavior_ids' | 'mode' | 'active' | 'created_at' | 'criterion_percent'>;
}
interface StudentSpec {
  code: string; grade: string; color: string; notes: string;
  behaviors: BehaviorSpec[];
  directGoal?: { title: string; description: string; baseline: string; start: number; end: number };
}

const STUDENTS: StudentSpec[] = [
  {
    code: 'JoSm', grade: '3', color: '#6366f1',
    notes: 'Responds well to a visual schedule and first/then language. Prefers movement breaks.',
    behaviors: [
      {
        name: 'Aggression', category: 'challenging', track: 'rating', abc: true, rate: [2.6, 0.7],
        description: 'Hitting, kicking or pushing a peer or adult with enough force to be felt.',
        antecedents: [['Demand placed', 5], ['Transition', 3], ['Peer conflict', 2]],
        consequences: [['Escape/break provided', 5], ['Redirected', 3], ['Attention given', 2]],
        goal: {
          title: 'Reduce aggression', description: 'JoSm will reduce aggression to 1 or fewer incidents per day across 4 of 5 consecutive school days.',
          criterion_direction: 'at_most', criterion_value: 1, criterion_metric: 'count_per_day',
          baseline: '3 per day (September)', target_date: null,
        },
      },
      {
        name: 'Elopement', category: 'challenging', track: 'duration', abc: true, rate: [0.8, 0.3], seconds: 240,
        description: 'Leaving the assigned area without permission for more than 10 seconds.',
        antecedents: [['Transition', 4], ['Unstructured time', 3], ['Demand placed', 1]],
        consequences: [['Redirected', 4], ['Attention given', 3]],
      },
      {
        name: 'Requests a break', category: 'skill', track: 'count', abc: false, rate: [0.4, 2.2],
        description: 'Uses the break card or says "break please" without prompting.',
      },
    ],
  },
  {
    code: 'AvRo', grade: '2', color: '#0ea5e9',
    notes: 'Strong reader. Off-task mostly during independent math.',
    behaviors: [
      {
        name: 'Calling out', category: 'challenging', track: 'count', abc: true, rate: [5, 2.5],
        description: 'Speaking to the teacher or class without raising a hand during whole-group instruction.',
        antecedents: [['Attention to others', 6], ['Unstructured time', 2]],
        consequences: [['Attention given', 4], ['Planned ignoring', 4], ['Peer reaction', 2]],
        goal: {
          title: 'Wait to be called on', description: 'AvRo will call out 2 or fewer times per day during whole-group instruction.',
          criterion_direction: 'at_most', criterion_value: 2, criterion_metric: 'count_per_day',
          baseline: '5 per day', target_date: null,
        },
      },
      {
        name: 'Off-task', category: 'challenging', track: 'duration', abc: false, rate: [3, 2], seconds: 300,
        description: 'Not engaged with the assigned task for more than 1 minute.',
        goal: {
          title: 'Stay on task in math', description: 'AvRo will be off-task for 10 or fewer minutes per day.',
          criterion_direction: 'at_most', criterion_value: 10, criterion_metric: 'minutes_per_day',
          baseline: '18 minutes per day', target_date: null,
        },
      },
      {
        name: 'Raises hand', category: 'skill', track: 'count', abc: false, rate: [1, 3.5],
        description: 'Raises a hand and waits to be called on.',
      },
    ],
  },
  {
    code: 'MiTa', grade: '4', color: '#10b981',
    notes: 'Shuts down when work looks long. Chunking tasks helps.',
    behaviors: [
      {
        name: 'Task refusal', category: 'challenging', track: 'rating', abc: true, rate: [1.8, 1],
        description: 'Says "no", puts head down, or pushes work away after a direction.',
        antecedents: [['Task difficulty', 6], ['Demand placed', 3], ['Change in routine', 1]],
        consequences: [['Escape/break provided', 3], ['Redirected', 4], ['Item/activity given', 1]],
      },
    ],
    directGoal: {
      title: 'Starts work within 2 minutes',
      description: 'MiTa will begin an assigned task within 2 minutes of the direction in 80% of opportunities.',
      baseline: '40% of opportunities', start: 0.4, end: 0.8,
    },
  },
  {
    code: 'ElKa', grade: 'K', color: '#f59e0b',
    notes: 'New this year. Learning classroom routines; uses some single words to request.',
    behaviors: [
      {
        name: 'Tantrum', category: 'challenging', track: 'duration', abc: true, rate: [1.2, 0.5], seconds: 420,
        description: 'Crying, screaming or dropping to the floor for 30 seconds or more.',
        antecedents: [['Denied access/item', 5], ['Transition', 4], ['Change in routine', 2]],
        consequences: [['Planned ignoring', 3], ['Item/activity given', 3], ['Attention given', 2]],
        goal: {
          title: 'Shorter tantrums', description: 'ElKa will recover from upsets within 5 minutes per day total.',
          criterion_direction: 'at_most', criterion_value: 5, criterion_metric: 'minutes_per_day',
          baseline: '12 minutes per day', target_date: null,
        },
      },
      {
        name: 'Uses words to request', category: 'skill', track: 'count', abc: false, rate: [1, 4],
        description: 'Requests an item or help with a word or short phrase instead of crying or grabbing.',
      },
    ],
  },
];

/** Class schedule; entries fall inside these blocks, with a few outside any session. */
const BLOCKS: { activity: string; setting: string; start: number; minutes: number }[] = [
  { activity: 'Morning meeting', setting: 'Classroom', start: 8 * 60 + 45, minutes: 20 },
  { activity: 'Reading', setting: 'Small group', start: 9 * 60 + 10, minutes: 50 },
  { activity: 'Math', setting: 'Classroom', start: 10 * 60 + 15, minutes: 50 },
  { activity: 'Lunch & recess', setting: 'Recess', start: 11 * 60 + 45, minutes: 40 },
  { activity: 'Specials', setting: 'Specials', start: 13 * 60, minutes: 45 },
];

const STAFF: Profile[] = [
  { id: LOCAL_USER_ID, display_name: 'You (demo)', initials: 'ME', role: 'admin', active: true, created_at: '' },
  { id: '00000000-0000-4000-8000-000000000002', display_name: 'Ms. Rivera', initials: 'MR', role: 'member', active: true, created_at: '' },
  { id: '00000000-0000-4000-8000-000000000003', display_name: 'Mr. Chen', initials: 'JC', role: 'member', active: true, created_at: '' },
];

/**
 * A believable classroom: 4 students, their behaviors and IEP goals, and ~6 weeks of school-day
 * sessions, entries and goal trials ending today. Challenging behaviors trend down and skills
 * trend up, so every chart and generated report has a story to tell.
 */
export function buildSampleData(now: Date, id: () => string, seed = 42): SampleData {
  const rand = mulberry32(seed);
  const pick = <T,>(weighted: [T, number][]): T => {
    let r = rand() * weighted.reduce((a, [, w]) => a + w, 0);
    for (const [v, w] of weighted) if ((r -= w) < 0) return v;
    return weighted[weighted.length - 1][0];
  };
  // Poisson-distributed count (Knuth); rates here are small.
  const poisson = (lambda: number) => {
    const limit = Math.exp(-lambda);
    let k = 0;
    for (let p = rand(); p > limit; p *= rand()) k++;
    return k;
  };

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 42);
  const createdAt = start.toISOString();

  // School days (Mon–Fri) from 6 weeks ago through today.
  const days: Date[] = [];
  for (const d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  const at = (day: Date, minuteOfDay: number) => {
    const t = new Date(day);
    t.setHours(0, minuteOfDay, Math.floor(rand() * 60), 0);
    return t;
  };

  const out: SampleData = {
    students: [], behaviors: [], abc_presets: defaultPresets(createdAt, id), sessions: [],
    events: [], goals: [], goal_entries: [],
    profiles: STAFF.map(p => ({ ...p, created_at: createdAt })),
  };

  // One shared session per block per day, cut off at "now" (today's later blocks haven't happened).
  const sessionsByDay = new Map<string, Session[]>();
  for (const day of days) {
    const list: Session[] = [];
    for (const b of BLOCKS) {
      const started = at(day, b.start);
      if (started > now) continue;
      const ended = new Date(Math.min(started.getTime() + b.minutes * 60_000, now.getTime()));
      const s: Session = {
        id: id(), activity: b.activity, setting: b.setting, started_at: started.toISOString(),
        // A block still in progress stays open, so the app opens mid-session like a real day.
        ended_at: ended < now ? ended.toISOString() : null, note: null, created_at: started.toISOString(),
      };
      list.push(s);
      out.sessions.push(s);
    }
    sessionsByDay.set(day.toDateString(), list);
  }

  for (const spec of STUDENTS) {
    const student: Student = {
      id: id(), code: spec.code, grade: spec.grade, notes: spec.notes, color: spec.color,
      active: true, created_at: createdAt,
    };
    out.students.push(student);

    for (const b of spec.behaviors) {
      const behavior: Behavior = {
        id: id(), student_id: student.id, name: b.name, description: b.description, category: b.category,
        track_frequency: b.track === 'count', track_duration: b.track === 'duration', track_rating: b.track === 'rating',
        requires_abc: b.abc, active: true, created_at: createdAt,
      };
      out.behaviors.push(behavior);

      days.forEach((day, i) => {
        const progress = days.length > 1 ? i / (days.length - 1) : 1;
        const lambda = b.rate[0] + (b.rate[1] - b.rate[0]) * progress;
        const sessions = sessionsByDay.get(day.toDateString()) ?? [];
        for (let n = poisson(lambda); n > 0; n--) {
          // Most entries happen inside a session; about 1 in 8 is logged outside one.
          const session = sessions.length > 0 && rand() > 0.12
            ? sessions[Math.floor(rand() * sessions.length)] : null;
          const when = session
            ? new Date(new Date(session.started_at).getTime()
                + rand() * ((session.ended_at ? new Date(session.ended_at) : now).getTime() - new Date(session.started_at).getTime()))
            : at(day, 8 * 60 + 15 + Math.floor(rand() * 7 * 60));
          if (when > now) continue;
          const seconds = b.seconds
            ? Math.max(30, Math.round(b.seconds * (0.4 + rand() * 1.2) * (1.2 - 0.5 * progress))) : null;
          out.events.push({
            id: id(), student_id: student.id, behavior_id: behavior.id, session_id: session?.id ?? null,
            occurred_at: when.toISOString(), count: 1,
            duration_seconds: b.track === 'duration' ? seconds : null,
            rating: b.track === 'rating' ? Math.min(5, Math.max(1, Math.round(4 - 2 * progress + (rand() * 2 - 1)))) : null,
            antecedent: b.abc && b.antecedents ? pick(b.antecedents) : null,
            consequence: b.abc && b.consequences ? pick(b.consequences) : null,
            setting: session?.setting ?? pick([['Hallway', 2], ['Classroom', 3], ['Bus', 1]]),
            note: null, recorder: null,
            user_id: pick([[STAFF[0].id, 3], [STAFF[1].id, 2], [STAFF[2].id, 2]]),
            created_at: when.toISOString(),
          });
        }
      });

      if (b.goal) {
        out.goals.push({
          id: id(), student_id: student.id, mode: 'linked', behavior_ids: [behavior.id],
          criterion_percent: null, active: true, created_at: createdAt, ...b.goal,
        });
      }
    }

    if (spec.directGoal) {
      const g = spec.directGoal;
      const goal: Goal = {
        id: id(), student_id: student.id, title: g.title, description: g.description, mode: 'direct',
        behavior_ids: [], criterion_direction: null, criterion_value: null, criterion_metric: null,
        criterion_percent: 80, baseline: g.baseline, target_date: null, active: true, created_at: createdAt,
      };
      out.goals.push(goal);
      // Earlier days only: today's tally is left for the visitor to tap.
      days.slice(0, -1).forEach((day, i) => {
        const opportunities = 4 + Math.floor(rand() * 4);
        const p = g.start + (g.end - g.start) * (i / Math.max(1, days.length - 2));
        let successes = 0;
        for (let k = 0; k < opportunities; k++) if (rand() < p) successes++;
        const when = at(day, 14 * 60 + 30);
        out.goal_entries.push({
          id: id(), goal_id: goal.id, session_id: null, occurred_at: when.toISOString(),
          successes, opportunities, note: null, created_at: when.toISOString(), device_id: 'sample-data',
        });
      });
    }
  }

  // Target dates ~3 months out, relative to "now", so they never look stale.
  const target = new Date(now);
  target.setMonth(target.getMonth() + 3);
  for (const g of out.goals) g.target_date = target.toISOString().slice(0, 10);

  return out;
}
