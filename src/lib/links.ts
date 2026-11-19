/** The data log filtered to one student (shareable, survives a refresh). */
export function manageLogHref(studentId: string): string {
  return `/manage/log?student=${encodeURIComponent(studentId)}`;
}

/** Where a page's back link should lead, when that is not the page's usual parent. */
export interface BackTarget { to: string; label: string }

/**
 * Router state for a link that leaves a student's page for a Manage screen, so the screen's
 * back link returns to that student instead of to Manage.
 */
export function backState(to: string, label: string): { back: BackTarget } {
  return { back: { to, label } };
}

/** The back target carried in router state, if the page was reached with one. */
export function backFromState(state: unknown): BackTarget | null {
  const back = (state as { back?: Partial<BackTarget> } | null)?.back;
  return back && typeof back.to === 'string' && typeof back.label === 'string'
    ? { to: back.to, label: back.label } : null;
}

/** A student's page, optionally opened on one of its tabs. */
export function studentHref(studentId: string, tab?: string | null): string {
  const base = `/student/${encodeURIComponent(studentId)}`;
  return tab && tab !== 'record' ? `${base}?tab=${encodeURIComponent(tab)}` : base;
}
