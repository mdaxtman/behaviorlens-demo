import { describe, it, expect } from 'vitest';
import {
  applyChanges, clearTables, deleteRow, getAllRows, getMeta, getPhotoIds, putPhoto, putRow, putRows, setMeta,
} from './db';

describe('db', () => {
  it('stores and retrieves rows by table', async () => {
    await putRow('students', { id: 's1', code: 'JoSm' });
    await putRows('students', [{ id: 's2', code: 'AbCd' }]);
    const rows = await getAllRows<{ id: string }>('students');
    expect(rows.map(r => r.id).sort()).toEqual(['s1', 's2']);
  });

  it('putRow with same id replaces', async () => {
    await putRow('behaviors', { id: 'b1', name: 'old' });
    await putRow('behaviors', { id: 'b1', name: 'new' });
    const rows = await getAllRows<{ name: string }>('behaviors');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('new');
  });

  it('deleteRow removes', async () => {
    await putRow('goals', { id: 'g1' });
    await deleteRow('goals', 'g1');
    expect(await getAllRows('goals')).toHaveLength(0);
  });

  it('applyChanges deletes and writes across tables together', async () => {
    await putRow('events', { id: 'e1', session_id: 'x1' });
    await putRow('sessions', { id: 'x1' });
    await applyChanges([{ table: 'sessions', id: 'x1' }], [{ table: 'events', row: { id: 'e1', session_id: null } }]);
    expect(await getAllRows('sessions')).toHaveLength(0);
    expect(await getAllRows('events')).toEqual([{ id: 'e1', session_id: null }]);
  });

  it('meta values persist', async () => {
    await setMeta('seeded', true);
    expect(await getMeta('seeded')).toBe(true);
  });

  it('clearTables empties data, and photos only when asked', async () => {
    await putRow('students', { id: 'c1' });
    await putPhoto('c1', new Blob(['x']));
    await clearTables(false);
    expect(await getAllRows('students')).toHaveLength(0);
    expect(await getPhotoIds()).toEqual(['c1']);
    await clearTables(true);
    expect(await getPhotoIds()).toEqual([]);
  });
});
