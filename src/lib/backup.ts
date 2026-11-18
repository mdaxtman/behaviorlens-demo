import type { TableName } from './db';

/**
 * Tables a backup carries, in foreign-key order (parents first) so an import can replay them
 * top to bottom. `profiles` rides along so entries keep their "recorded by" names.
 */
export const BACKUP_TABLES = [
  'students', 'behaviors', 'abc_presets', 'sessions', 'events', 'goals', 'goal_entries', 'profiles',
] as const satisfies readonly TableName[];
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type Row = Record<string, unknown> & { id: string };

export interface Backup {
  app: 'behaviorlens';
  version: 1;
  exported_at: string;
  tables: Record<BackupTable, Row[]>;
  /** Student id -> image data URL. Present only when the export opted in to photos. */
  photos?: Record<string, string>;
}

export function buildBackup(
  tables: Partial<Record<BackupTable, unknown[]>>,
  photos?: Record<string, string>,
  now = new Date(),
): Backup {
  const out = {} as Record<BackupTable, Row[]>;
  for (const t of BACKUP_TABLES) out[t] = (tables[t] ?? []) as Row[];
  return {
    app: 'behaviorlens', version: 1, exported_at: now.toISOString(), tables: out,
    ...(photos && Object.keys(photos).length > 0 ? { photos } : {}),
  };
}

/** Parse and validate a backup file. Throws an Error whose message is safe to show the user. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a BehaviorLens backup (it isn't valid JSON).");
  }
  const obj = raw as Partial<Backup> | null;
  if (!obj || typeof obj !== 'object' || obj.app !== 'behaviorlens' || typeof obj.tables !== 'object' || !obj.tables) {
    throw new Error("This file isn't a BehaviorLens backup.");
  }
  if (obj.version !== 1) {
    throw new Error(`This backup is from a newer version of BehaviorLens (format ${String(obj.version)}).`);
  }
  const tables = {} as Record<BackupTable, Row[]>;
  for (const t of BACKUP_TABLES) {
    const rows = (obj.tables as Record<string, unknown>)[t] ?? [];
    if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== 'object' || typeof (r as Row).id !== 'string')) {
      throw new Error(`The backup's "${t}" data is damaged.`);
    }
    tables[t] = rows as Row[];
  }
  const photos: Record<string, string> = {};
  if (obj.photos && typeof obj.photos === 'object') {
    for (const [id, url] of Object.entries(obj.photos)) {
      // Only inline images — never a remote URL the app would then fetch.
      if (typeof url === 'string' && url.startsWith('data:image/')) photos[id] = url;
    }
  }
  return {
    app: 'behaviorlens', version: 1,
    exported_at: typeof obj.exported_at === 'string' ? obj.exported_at : '',
    tables,
    ...(Object.keys(photos).length > 0 ? { photos } : {}),
  };
}

export function backupSummary(b: Backup): string {
  const n = (t: BackupTable) => b.tables[t].length;
  const parts = [
    `${n('students')} student${n('students') === 1 ? '' : 's'}`,
    `${n('behaviors')} behavior${n('behaviors') === 1 ? '' : 's'}`,
    `${n('goals')} goal${n('goals') === 1 ? '' : 's'}`,
    `${n('events')} entr${n('events') === 1 ? 'y' : 'ies'}`,
  ];
  const photos = Object.keys(b.photos ?? {}).length;
  if (photos > 0) parts.push(`${photos} photo${photos === 1 ? '' : 's'}`);
  return parts.join(', ');
}

export function backupFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `behaviorlens-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Save a JSON document as a file download. */
export function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
