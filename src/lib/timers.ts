const KEY = 'bl_timers';

export interface RunningTimer { behaviorId: string; studentId: string; startedAt: string }

export function getTimers(): RunningTimer[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
export function getTimer(behaviorId: string): RunningTimer | undefined {
  return getTimers().find(t => t.behaviorId === behaviorId);
}
export function startTimer(behaviorId: string, studentId: string) {
  const timers = getTimers().filter(t => t.behaviorId !== behaviorId);
  timers.push({ behaviorId, studentId, startedAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(timers));
}
export function stopTimer(behaviorId: string): number | null {
  const t = getTimer(behaviorId);
  if (!t) return null;
  localStorage.setItem(KEY, JSON.stringify(getTimers().filter(x => x.behaviorId !== behaviorId)));
  return Math.max(1, Math.round((Date.now() - new Date(t.startedAt).getTime()) / 1000));
}
export function restoreTimer(behaviorId: string, studentId: string, elapsedSecs: number) {
  const timers = getTimers().filter(t => t.behaviorId !== behaviorId);
  timers.push({ behaviorId, studentId, startedAt: new Date(Date.now() - elapsedSecs * 1000).toISOString() });
  localStorage.setItem(KEY, JSON.stringify(timers));
}
export function elapsedSeconds(t: RunningTimer): number {
  return Math.round((Date.now() - new Date(t.startedAt).getTime()) / 1000);
}
