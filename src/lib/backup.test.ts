import { describe, it, expect } from 'vitest';
import { BACKUP_TABLES, backupFilename, backupSummary, buildBackup, parseBackup } from './backup';

describe('backup', () => {
  const now = new Date(2026, 10, 17, 9, 30);

  it('round-trips through JSON, filling missing tables with []', () => {
    const b = buildBackup({ students: [{ id: 's1', code: 'JoSm' }] }, undefined, now);
    const back = parseBackup(JSON.stringify(b));
    expect(back.tables.students).toEqual([{ id: 's1', code: 'JoSm' }]);
    for (const t of BACKUP_TABLES) expect(Array.isArray(back.tables[t])).toBe(true);
    expect(back.photos).toBeUndefined();
    expect(back.exported_at).toBe(now.toISOString());
  });

  it('lists tables parents-first so an import never inserts a child before its parent', () => {
    const i = (t: string) => BACKUP_TABLES.indexOf(t as never);
    expect(i('students')).toBeLessThan(i('behaviors'));
    expect(i('behaviors')).toBeLessThan(i('events'));
    expect(i('sessions')).toBeLessThan(i('events'));
    expect(i('goals')).toBeLessThan(i('goal_entries'));
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/valid JSON/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/isn't a BehaviorLens backup/);
    expect(() => parseBackup(JSON.stringify({ app: 'behaviorlens', version: 2, tables: {} })))
      .toThrow(/newer version/);
    expect(() => parseBackup(JSON.stringify({ app: 'behaviorlens', version: 1, tables: { events: [{ no: 'id' }] } })))
      .toThrow(/"events" data is damaged/);
  });

  it('keeps only inline image photos, never remote URLs', () => {
    const b = buildBackup({}, { s1: 'data:image/jpeg;base64,AAAA', s2: 'https://evil.example/x.png' }, now);
    expect(parseBackup(JSON.stringify(b)).photos).toEqual({ s1: 'data:image/jpeg;base64,AAAA' });
  });

  it('summarizes counts with correct plurals', () => {
    const b = buildBackup({
      students: [{ id: 's1' }], events: [{ id: 'e1' }, { id: 'e2' }],
    }, { s1: 'data:image/png;base64,AA' }, now);
    expect(backupSummary(b)).toBe('1 student, 0 behaviors, 0 goals, 2 entries, 1 photo');
  });

  it('names the file by local date', () => {
    expect(backupFilename(now)).toBe('behaviorlens-backup-2026-11-17.json');
  });
});
