import { describe, expect, it } from 'vitest';
import {
  bankKey, buildBank, planSharedSave, planStudentSave, settingsOf, settingsSummary,
  starterSuggestions, studentOptions, copyForStudent, STARTER_BEHAVIORS,
  type BehaviorSettings,
} from './behaviorBank';
import type { Behavior, Student } from './types';

const student = (id: string, code: string): Student => ({
  id, code, grade: null, notes: null, color: '#000', active: true, created_at: '2026-01-01T00:00:00Z',
});
const behavior = (id: string, studentId: string, over: Partial<Behavior> = {}): Behavior => ({
  id, student_id: studentId, name: 'Aggression', description: 'Hitting or kicking',
  category: 'challenging', track_frequency: true, track_duration: false, track_rating: true,
  requires_abc: true, active: true, created_at: '2026-01-01T00:00:00Z', ...over,
});

const A = student('a', 'AnBe'), B = student('b', 'BoCa'), C = student('c', 'CyDo');
const NOW = '2026-11-18T12:00:00Z';
const ids = () => { let n = 0; return () => `new-${++n}`; };

describe('bankKey', () => {
  it('ignores case and surrounding space, so near-identical names group together', () => {
    expect(bankKey('  Aggression ')).toBe(bankKey('aggression'));
  });
});

describe('buildBank', () => {
  it('groups same-named behaviors across students into one entry, sorted by name', () => {
    const bank = buildBank([
      behavior('1', 'a'), behavior('2', 'b', { name: 'aggression ' }),
      behavior('3', 'a', { name: 'Elopement' }),
    ], [A, B]);
    expect(bank.map(e => e.name)).toEqual(['Aggression', 'Elopement']);
    expect(bank[0].members.map(m => m.student.code)).toEqual(['AnBe', 'BoCa']);
    expect(bank[1].members.map(m => m.student.code)).toEqual(['AnBe']);
  });

  it('takes the most common settings as the shared version and flags the rest as customized', () => {
    const bank = buildBank([
      behavior('1', 'a'), behavior('2', 'b'),
      behavior('3', 'c', { requires_abc: false }),
    ], [A, B, C]);
    expect(bank[0].settings.requires_abc).toBe(true);
    expect(bank[0].members.map(m => m.customized)).toEqual([false, false, true]);
  });

  it('breaks a tie in favor of the version created first', () => {
    const bank = buildBank([
      behavior('1', 'a', { track_duration: true, created_at: '2026-03-01T00:00:00Z' }),
      behavior('2', 'b', { created_at: '2026-02-01T00:00:00Z' }),
    ], [A, B]);
    expect(bank[0].settings.track_duration).toBe(false);
    expect(bank[0].members.find(m => m.student.id === 'a')?.customized).toBe(true);
  });

  it('leaves out behaviors whose student is not in the list', () => {
    expect(buildBank([behavior('1', 'gone')], [A])).toEqual([]);
  });
});

describe('starterSuggestions', () => {
  it('offers the common behaviors the class does not have yet', () => {
    const bank = buildBank([behavior('1', 'a')], [A]);
    const names = starterSuggestions(bank).map(s => s.name);
    expect(names).not.toContain('Aggression');
    expect(names.length).toBe(STARTER_BEHAVIORS.length - 1);
  });
});

describe('settingsSummary', () => {
  it('describes how a behavior is recorded', () => {
    expect(settingsSummary(settingsOf(behavior('1', 'a')))).toBe('Challenging · rating · ABC');
    expect(settingsSummary({ ...settingsOf(behavior('1', 'a')), category: 'skill',
      track_rating: false, track_duration: true, requires_abc: false })).toBe('Skill · timed');
    expect(settingsSummary({ ...settingsOf(behavior('1', 'a')),
      track_rating: false, requires_abc: false })).toBe('Challenging · count');
  });
});

describe('planSharedSave', () => {
  const settings: BehaviorSettings = settingsOf(behavior('x', 'x'));

  it('creates one copy per picked student for a new behavior', () => {
    const rows = planSharedSave({
      entry: null, settings, studentIds: ['a', 'b'], overwriteCustomized: false, now: NOW, newId: ids(),
    });
    expect(rows.map(r => [r.id, r.student_id, r.name, r.active, r.created_at])).toEqual([
      ['new-1', 'a', 'Aggression', true, NOW], ['new-2', 'b', 'Aggression', true, NOW],
    ]);
  });

  it('applies an edit to every picked student and writes nothing for unchanged copies', () => {
    const [entry] = buildBank([behavior('1', 'a'), behavior('2', 'b')], [A, B]);
    expect(planSharedSave({
      entry, settings: entry.settings, studentIds: ['a', 'b'], overwriteCustomized: false, now: NOW, newId: ids(),
    })).toEqual([]);
    const rows = planSharedSave({
      entry, settings: { ...entry.settings, description: 'New definition' },
      studentIds: ['a', 'b'], overwriteCustomized: false, now: NOW, newId: ids(),
    });
    expect(rows.map(r => [r.id, r.description])).toEqual([['1', 'New definition'], ['2', 'New definition']]);
  });

  it('keeps a customized copy as it is, apart from the name, unless told to replace it', () => {
    const [entry] = buildBank([
      behavior('1', 'a'), behavior('2', 'b'), behavior('3', 'c', { requires_abc: false }),
    ], [A, B, C]);
    const edit = { ...entry.settings, name: 'Physical aggression', track_duration: true };
    const kept = planSharedSave({
      entry, settings: edit, studentIds: ['a', 'b', 'c'], overwriteCustomized: false, now: NOW, newId: ids(),
    }).find(r => r.id === '3');
    expect(kept).toMatchObject({ name: 'Physical aggression', requires_abc: false, track_duration: false });
    const replaced = planSharedSave({
      entry, settings: edit, studentIds: ['a', 'b', 'c'], overwriteCustomized: true, now: NOW, newId: ids(),
    }).find(r => r.id === '3');
    expect(replaced).toMatchObject({ name: 'Physical aggression', requires_abc: true, track_duration: true });
  });

  it('retires, never deletes, the copy of a student who is unpicked', () => {
    const [entry] = buildBank([behavior('1', 'a'), behavior('2', 'b')], [A, B]);
    const rows = planSharedSave({
      entry, settings: entry.settings, studentIds: ['a'], overwriteCustomized: false, now: NOW, newId: ids(),
    });
    expect(rows).toEqual([{ ...behavior('2', 'b'), active: false }]);
  });

  it('brings back a retired copy, with its history, when the student is picked again', () => {
    const [entry] = buildBank([behavior('1', 'a'), behavior('2', 'b', { active: false })], [A, B]);
    const rows = planSharedSave({
      entry, settings: entry.settings, studentIds: ['a', 'b'], overwriteCustomized: false, now: NOW, newId: ids(),
    });
    expect(rows).toEqual([{ ...behavior('2', 'b'), active: true }]);
  });

  it('adds a copy for a newly picked student', () => {
    const [entry] = buildBank([behavior('1', 'a')], [A, B]);
    const rows = planSharedSave({
      entry, settings: entry.settings, studentIds: ['a', 'b'], overwriteCustomized: false, now: NOW, newId: ids(),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'new-1', student_id: 'b', name: 'Aggression', active: true });
  });
});

describe('planStudentSave', () => {
  it('changes only that student unless others are named', () => {
    const mine = behavior('1', 'a', { description: 'Just for AnBe' });
    expect(planStudentSave(mine, [])).toEqual([mine]);
  });

  it('copies the settings, not the active flag or identity, to the named copies', () => {
    const mine = behavior('1', 'a', { description: 'Shared wording', active: false });
    const other = behavior('2', 'b');
    expect(planStudentSave(mine, [other])).toEqual([mine, { ...other, description: 'Shared wording' }]);
  });
});

describe('studentOptions', () => {
  it('splits the class list into what a student tracks, can add, and can restore', () => {
    const bank = buildBank([
      behavior('1', 'a'), behavior('2', 'b'),
      behavior('3', 'b', { name: 'Elopement' }),
      behavior('4', 'a', { name: 'Off-task', active: false }), behavior('5', 'b', { name: 'Off-task' }),
    ], [A, B]);
    const o = studentOptions(bank, 'a');
    expect(o.tracking.map(b => b.name)).toEqual(['Aggression']);
    expect(o.available.map(x => [x.entry.name, x.retired?.id ?? null])).toEqual([
      ['Elopement', null], ['Off-task', '4'],
    ]);
  });
});

describe('copyForStudent', () => {
  it('makes a fresh active copy of the shared settings', () => {
    const s = settingsOf(behavior('1', 'a'));
    expect(copyForStudent(s, 'b', NOW, 'n1')).toEqual({ ...s, id: 'n1', student_id: 'b', active: true, created_at: NOW });
  });
});
