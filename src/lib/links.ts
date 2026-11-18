/**
 * Deep link from a student's page into a Manage screen with that student preselected and the
 * "new" form already open — the shortcut from "I'm looking at JoSm" to "add something for JoSm".
 */
export function manageNewHref(kind: 'behaviors' | 'goals', studentId: string): string {
  return `/manage/${kind}?student=${encodeURIComponent(studentId)}&new=1`;
}

/** The data log filtered to one student (shareable, survives a refresh). */
export function manageLogHref(studentId: string): string {
  return `/manage/log?student=${encodeURIComponent(studentId)}`;
}
