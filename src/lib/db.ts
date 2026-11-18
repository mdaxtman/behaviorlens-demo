import { openDB, type IDBPDatabase } from 'idb';

export type TableName =
  | 'students' | 'behaviors' | 'abc_presets' | 'sessions'
  | 'events' | 'goals' | 'goal_entries' | 'profiles';

export const TABLES: TableName[] = [
  'students', 'behaviors', 'abc_presets', 'sessions', 'events', 'goals', 'goal_entries', 'profiles',
];

const DB_NAME = 'behaviorlens-demo';
let dbp: Promise<IDBPDatabase> | null = null;

/** All app data lives here, in this browser only: one store per table, plus photos and meta. */
function getDB() {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(db) {
        const has = (name: string) => db.objectStoreNames.contains(name);
        for (const t of TABLES) if (!has(t)) db.createObjectStore(t, { keyPath: 'id' });
        if (!has('photos')) db.createObjectStore('photos');
        if (!has('meta')) db.createObjectStore('meta');
      },
    });
  }
  return dbp;
}

export async function getAllRows<T>(table: TableName): Promise<T[]> {
  return (await getDB()).getAll(table);
}
export async function putRow(table: TableName, row: Record<string, unknown>) {
  await (await getDB()).put(table, row);
}
export async function putRows(table: TableName, rows: unknown[]) {
  const tx = (await getDB()).transaction(table, 'readwrite');
  for (const r of rows) void tx.store.put(r);
  await tx.done;
}
export async function deleteRow(table: TableName, id: string) {
  await (await getDB()).delete(table, id);
}

/** Apply many deletes and puts across tables in ONE transaction: all happen, or none do. */
export async function applyChanges(
  deletes: { table: TableName; id: string }[],
  puts: { table: TableName; row: Record<string, unknown> }[],
) {
  const stores = [...new Set([...deletes, ...puts].map(c => c.table))];
  if (stores.length === 0) return;
  const tx = (await getDB()).transaction(stores, 'readwrite');
  for (const d of deletes) void tx.objectStore(d.table).delete(d.id);
  for (const p of puts) void tx.objectStore(p.table).put(p.row);
  await tx.done;
}

/** Empty every data table (and, optionally, photos) in one transaction. */
export async function clearTables(includePhotos: boolean) {
  const stores = [...TABLES, ...(includePhotos ? ['photos'] : [])];
  const tx = (await getDB()).transaction(stores, 'readwrite');
  for (const s of stores) void tx.objectStore(s).clear();
  await tx.done;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await getDB()).get('meta', key);
}
export async function setMeta(key: string, value: unknown) {
  await (await getDB()).put('meta', value, key);
}

export async function putPhoto(studentId: string, blob: Blob) {
  await (await getDB()).put('photos', blob, studentId);
}
export async function getPhoto(studentId: string): Promise<Blob | undefined> {
  return (await getDB()).get('photos', studentId);
}
export async function deletePhoto(studentId: string) {
  await (await getDB()).delete('photos', studentId);
}
export async function getPhotoIds(): Promise<string[]> {
  return (await (await getDB()).getAllKeys('photos')) as string[];
}
