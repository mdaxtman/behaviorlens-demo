/**
 * In-app "this student's photo changed" signal. Every rendered avatar subscribes, so taking,
 * choosing or removing a photo updates all of that student's pictures at once (the student
 * list, Home grid, page header) instead of only the edit form's preview.
 */
type Listener = (studentId: string) => void;
const listeners = new Set<Listener>();

export function onPhotoChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function notifyPhotoChange(studentId: string) {
  // Iterate a copy so a listener unsubscribing mid-notify can't skip the others.
  for (const fn of [...listeners]) fn(studentId);
}
