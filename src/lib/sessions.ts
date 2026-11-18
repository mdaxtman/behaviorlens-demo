import type { Session } from './types';

/** An open session older than this was almost certainly forgotten, not still running. */
export const STALE_SESSION_HOURS = 12;

/**
 * The session new recordings attach to: the most recently started open session, ignoring
 * open sessions left running from an earlier day. A forgotten session would otherwise stay
 * "active" forever and silently tag every later recording with the wrong activity.
 */
export function currentSession(sessions: Session[], now = new Date()): Session | null {
  const cutoff = now.getTime() - STALE_SESSION_HOURS * 3600 * 1000;
  return sessions
    .filter(s => !s.ended_at && new Date(s.started_at).getTime() >= cutoff)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null;
}
