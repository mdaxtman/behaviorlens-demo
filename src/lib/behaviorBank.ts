import type { Behavior, Student } from './types';

/**
 * The behavior bank: one list of behaviors for the whole class, built from the per-student
 * behavior rows rather than stored separately.
 *
 * Each student still owns their own copy of a behavior (recordings, goals and charts all point
 * at that copy), so one student's definition or tracking can differ without touching anyone
 * else. Copies that share a name are shown as one entry, which is what makes "set it up once,
 * give it to three students" possible without a second table.
 */

/** Everything about a behavior that is the same decision for each student who has it. */
export type BehaviorSettings = Pick<Behavior,
  'name' | 'description' | 'category' | 'track_frequency' | 'track_duration' | 'track_rating' | 'requires_abc'>;

export const DEFAULT_SETTINGS: BehaviorSettings = {
  name: '', description: null, category: 'challenging',
  track_frequency: true, track_duration: false, track_rating: false,
  // ABC is required by default on new behaviors until the team understands the function.
  requires_abc: true,
};

const starter = (
  name: string, description: string, category: Behavior['category'],
  track: 'count' | 'duration' | 'rating', abc: boolean,
): BehaviorSettings => ({
  name, description, category, track_frequency: true,
  track_duration: track === 'duration', track_rating: track === 'rating', requires_abc: abc,
});

/** Common classroom behaviors offered as a starting point. Each is copied, then yours to edit. */
export const STARTER_BEHAVIORS: BehaviorSettings[] = [
  starter('Aggression', 'Hitting, kicking or pushing a peer or adult with enough force to be felt.', 'challenging', 'rating', true),
  starter('Elopement', 'Leaving the assigned area without permission for more than 10 seconds.', 'challenging', 'duration', true),
  starter('Property destruction', 'Throwing, breaking, tearing or damaging materials or furniture.', 'challenging', 'count', true),
  starter('Self-injury', 'Hitting, biting or scratching own body.', 'challenging', 'rating', true),
  starter('Tantrum', 'Crying, screaming or dropping to the floor for more than 30 seconds.', 'challenging', 'duration', true),
  starter('Verbal outburst', 'Shouting, calling out or using unkind words loud enough to disrupt others.', 'challenging', 'count', true),
  starter('Refusal', 'Not starting a direction within 30 seconds of it being given.', 'challenging', 'count', true),
  starter('Off-task', 'Not working on the assigned activity for more than 1 minute.', 'challenging', 'duration', false),
  starter('Asked for a break', 'Used words, a card or a sign to ask for a break instead of leaving or acting out.', 'skill', 'count', false),
  starter('Asked for help', 'Asked an adult or peer for help when stuck.', 'skill', 'count', false),
  starter('Followed direction', 'Started a direction within 30 seconds, with no more than one reminder.', 'skill', 'count', false),
];

/** Copies whose names match by this key are the same behavior in the bank. */
export function bankKey(name: string): string {
  return name.trim().toLowerCase();
}

export function settingsOf(b: BehaviorSettings): BehaviorSettings {
  return {
    name: b.name, description: b.description, category: b.category,
    track_frequency: b.track_frequency, track_duration: b.track_duration,
    track_rating: b.track_rating, requires_abc: b.requires_abc,
  };
}

/** Everything but the name, as a comparable string. */
function signature(b: BehaviorSettings): string {
  return JSON.stringify([
    b.description ?? '', b.category, b.track_frequency, b.track_duration, b.track_rating, b.requires_abc,
  ]);
}

/** A short line describing how a behavior is recorded. */
export function settingsSummary(s: BehaviorSettings): string {
  const parts = [s.category === 'challenging' ? 'Challenging' : 'Skill'];
  if (s.track_duration) parts.push('timed');
  if (s.track_rating) parts.push('rating');
  if (!s.track_duration && !s.track_rating) parts.push('count');
  if (s.requires_abc) parts.push('ABC');
  return parts.join(' · ');
}

export interface BankMember {
  behavior: Behavior;
  student: Student;
  /** This student's copy differs from the shared version in more than its name. */
  customized: boolean;
}

export interface BankEntry {
  key: string;
  name: string;
  /** The shared version: the settings most of the copies have. */
  settings: BehaviorSettings;
  members: BankMember[];
}

/** The class's behaviors, one entry per name, for the given students (pass the active ones). */
export function buildBank(behaviors: Behavior[], students: Student[]): BankEntry[] {
  const byId = new Map(students.map(s => [s.id, s]));
  const groups = new Map<string, Behavior[]>();
  for (const b of behaviors) {
    if (!byId.has(b.student_id)) continue;
    const key = bankKey(b.name);
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  const entries: BankEntry[] = [];
  for (const [key, copies] of groups) {
    const oldestFirst = [...copies].sort((a, b) => a.created_at.localeCompare(b.created_at));
    // The shared version is the most common one; on a tie, the one that was set up first.
    const counts = new Map<string, number>();
    for (const b of oldestFirst) counts.set(signature(b), (counts.get(signature(b)) ?? 0) + 1);
    let shared = oldestFirst[0];
    for (const b of oldestFirst) {
      if ((counts.get(signature(b)) ?? 0) > (counts.get(signature(shared)) ?? 0)) shared = b;
    }
    const settings = { ...settingsOf(shared), name: shared.name.trim() };
    entries.push({
      key, name: settings.name, settings,
      members: copies
        .map(b => ({ behavior: b, student: byId.get(b.student_id)!, customized: signature(b) !== signature(shared) }))
        .sort((a, b) => a.student.code.localeCompare(b.student.code)),
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/** Starter behaviors the class does not already have. */
export function starterSuggestions(bank: BankEntry[]): BehaviorSettings[] {
  const have = new Set(bank.map(e => e.key));
  return STARTER_BEHAVIORS.filter(s => !have.has(bankKey(s.name)));
}

export function copyForStudent(settings: BehaviorSettings, studentId: string, now: string, id: string): Behavior {
  return { ...settingsOf(settings), id, student_id: studentId, active: true, created_at: now };
}

const changed = (a: Behavior, b: Behavior) => JSON.stringify(a) !== JSON.stringify(b);

/**
 * The rows to write when a behavior is saved for the whole class.
 *
 * - A picked student gets the settings (a new copy, or their existing one updated and active).
 * - A customized copy keeps its own settings and only follows a rename, unless
 *   `overwriteCustomized` is set.
 * - An unpicked student's copy is retired, never deleted: this device may not hold all of its
 *   recordings, and deleting the behavior would delete them everywhere.
 */
export function planSharedSave(opts: {
  entry: BankEntry | null;
  settings: BehaviorSettings;
  studentIds: string[];
  overwriteCustomized: boolean;
  now: string;
  newId: () => string;
}): Behavior[] {
  const { entry, studentIds, overwriteCustomized, now, newId } = opts;
  const settings = { ...settingsOf(opts.settings), name: opts.settings.name.trim() };
  const rows: Behavior[] = [];
  const have = new Set<string>();
  for (const m of entry?.members ?? []) {
    have.add(m.student.id);
    const b = m.behavior;
    let next: Behavior;
    if (!studentIds.includes(m.student.id)) {
      next = { ...b, name: settings.name, active: false };
    } else if (m.customized && !overwriteCustomized) {
      next = { ...b, name: settings.name, active: true };
    } else {
      next = { ...b, ...settings, active: true };
    }
    if (changed(b, next)) rows.push(next);
  }
  for (const studentId of studentIds) {
    if (!have.has(studentId)) rows.push(copyForStudent(settings, studentId, now, newId()));
  }
  return rows;
}

/** The rows to write when one student's copy is edited, optionally carrying the edit to others. */
export function planStudentSave(mine: Behavior, alsoUpdate: Behavior[]): Behavior[] {
  return [mine, ...alsoUpdate.map(b => ({ ...b, ...settingsOf(mine) }))];
}

/** For one student: what they track now, and what else from the class list they could have. */
export function studentOptions(bank: BankEntry[], studentId: string): {
  tracking: Behavior[];
  available: { entry: BankEntry; retired: Behavior | null }[];
} {
  const tracking: Behavior[] = [];
  const available: { entry: BankEntry; retired: Behavior | null }[] = [];
  for (const entry of bank) {
    const mine = entry.members.filter(m => m.student.id === studentId).map(m => m.behavior);
    const active = mine.filter(b => b.active);
    if (active.length > 0) tracking.push(...active);
    else available.push({ entry, retired: mine[0] ?? null });
  }
  return { tracking: tracking.sort((a, b) => a.name.localeCompare(b.name)), available };
}
