import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import * as db from './db';
import type { TableName } from './db';
import { BACKUP_TABLES, buildBackup, type Backup } from './backup';
import { planDelete } from './cascade';
import { uuid } from './id';
import { exportPhotos, importPhotos } from './photos';
import { notifyPhotoChange } from './photoEvents';
import { buildSampleData, defaultPresets, LOCAL_USER_ID } from './sampleData';
import { currentSession } from './sessions';
import type {
  Student, Behavior, AbcPreset, Session, BehaviorEvent, Goal, GoalEntry, Profile,
} from './types';

interface Tables {
  students: Student[]; behaviors: Behavior[]; abc_presets: AbcPreset[];
  sessions: Session[]; events: BehaviorEvent[]; goals: Goal[]; goal_entries: GoalEntry[];
  profiles: Profile[];
}

const EMPTY: Tables = {
  students: [], behaviors: [], abc_presets: [], sessions: [], events: [], goals: [], goal_entries: [],
  profiles: [],
};

export interface DataContextValue extends Tables {
  ready: boolean;
  activeSession: Session | null;
  /** The person using this browser — the recorder for new entries. */
  userId: string;
  save: (table: TableName, row: { id: string }) => Promise<void>;
  /** Delete a row and everything that depends on it (a student takes their behaviors, goals and entries). */
  removeRow: (table: TableName, id: string) => Promise<void>;
  exportBackup: (includePhotos: boolean) => Promise<Backup>;
  /** 'merge' upserts the file's records; 'replace' clears this browser's data first. */
  importBackup: (backup: Backup, mode: 'merge' | 'replace') => Promise<void>;
  /** Replace everything with a fresh copy of the sample classroom. */
  resetDemo: () => Promise<void>;
  /** Remove all students and records, keeping the ABC presets and your profile. */
  startEmpty: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const SEEDED = 'seeded';

async function writeAll(data: Partial<Tables>) {
  for (const t of db.TABLES) {
    const rows = data[t];
    if (rows && rows.length > 0) await db.putRows(t, rows);
  }
}

/**
 * First visit: open on a full sample classroom so every screen has something to show.
 * Module-level so it runs once per page load — React StrictMode (and a fast remount) would
 * otherwise run two seeds concurrently, both see "not seeded", and duplicate the classroom.
 */
let seeding: Promise<void> | null = null;
function seedOnce(): Promise<void> {
  seeding ??= (async () => {
    if (await db.getMeta(SEEDED)) return;
    await db.setMeta(SEEDED, true);
    await writeAll(buildSampleData(new Date(), uuid));
  })();
  return seeding;
}

/** Clear everything (including photos) and repaint every avatar. */
async function clearAll() {
  const photoIds = await db.getPhotoIds();
  await db.clearTables(true);
  for (const id of photoIds) notifyPhotoChange(id);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<Tables>(EMPTY);
  const [ready, setReady] = useState(false);

  const loadAll = useCallback(async () => {
    const next = { ...EMPTY };
    for (const t of db.TABLES) (next as Record<string, unknown>)[t] = await db.getAllRows(t);
    setTables(next);
  }, []);

  useEffect(() => {
    void (async () => {
      await seedOnce();
      await loadAll();
      setReady(true);
    })();
  }, [loadAll]);

  // State first for an instant UI, then IndexedDB.
  const save = useCallback(async (table: TableName, row: { id: string }) => {
    setTables(prev => ({
      ...prev,
      [table]: [...(prev[table] as { id: string }[]).filter(r => r.id !== row.id), row],
    }));
    await db.putRow(table, row as Record<string, unknown>);
  }, []);

  const removeRow = useCallback(async (table: TableName, id: string) => {
    const plan = planDelete(table, id, tables as unknown as Parameters<typeof planDelete>[2]);
    setTables(prev => {
      const next = { ...prev } as unknown as Record<TableName, { id: string }[]>;
      for (const d of plan.deletes) next[d.table] = next[d.table].filter(r => r.id !== d.id);
      for (const u of plan.updates) next[u.table] = next[u.table].map(r => (r.id === u.row.id ? u.row : r));
      return next as unknown as Tables;
    });
    await db.applyChanges(plan.deletes, plan.updates);
  }, [tables]);

  const exportBackup = useCallback(async (includePhotos: boolean) => {
    const rows = Object.fromEntries(
      await Promise.all(BACKUP_TABLES.map(async t => [t, await db.getAllRows(t)] as const)));
    return buildBackup(rows, includePhotos ? await exportPhotos() : undefined);
  }, []);

  const importBackup = useCallback(async (backup: Backup, mode: 'merge' | 'replace') => {
    const me = (await db.getAllRows<Profile>('profiles')).find(p => p.id === LOCAL_USER_ID);
    if (mode === 'replace') await clearAll();
    for (const t of BACKUP_TABLES) await db.putRows(t, backup.tables[t]);
    // Keep your own name: a backup from someone else's browser carries theirs.
    if (me) await db.putRow('profiles', me as unknown as Record<string, unknown>);
    if (backup.photos) await importPhotos(backup.photos);
    await loadAll();
  }, [loadAll]);

  const resetDemo = useCallback(async () => {
    const me = (await db.getAllRows<Profile>('profiles')).find(p => p.id === LOCAL_USER_ID);
    await clearAll();
    await writeAll(buildSampleData(new Date(), uuid));
    if (me) await db.putRow('profiles', me as unknown as Record<string, unknown>); // keep your name
    await loadAll();
  }, [loadAll]);

  const startEmpty = useCallback(async () => {
    const me = (await db.getAllRows<Profile>('profiles')).find(p => p.id === LOCAL_USER_ID);
    const now = new Date().toISOString();
    await clearAll();
    await writeAll({
      abc_presets: defaultPresets(now, uuid),
      profiles: [me ?? {
        id: LOCAL_USER_ID, display_name: 'You', initials: '', role: 'admin', active: true, created_at: now,
      }],
    });
    await loadAll();
  }, [loadAll]);

  const activeSession = useMemo(() => currentSession(tables.sessions), [tables.sessions]);

  const value: DataContextValue = {
    ...tables, ready, activeSession, userId: LOCAL_USER_ID,
    save, removeRow, exportBackup, importBackup, resetDemo, startEmpty,
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
