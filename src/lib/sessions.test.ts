import { describe, it, expect } from 'vitest';
import { currentSession } from './sessions';
import type { Session } from './types';

const s = (id: string, started_at: string, ended_at: string | null = null): Session =>
  ({ id, activity: id, setting: null, started_at, ended_at, note: null, created_at: started_at });

describe('currentSession', () => {
  const now = new Date('2026-11-17T15:00:00Z');

  it('picks the most recently started open session', () => {
    expect(currentSession([
      s('a', '2026-11-17T09:00:00Z'), s('b', '2026-11-17T13:00:00Z'), s('c', '2026-11-17T14:00:00Z', '2026-11-17T14:30:00Z'),
    ], now)?.id).toBe('b');
  });

  it('ignores a session forgotten open from an earlier day', () => {
    expect(currentSession([s('old', '2026-11-16T09:00:00Z')], now)).toBeNull();
  });
});
