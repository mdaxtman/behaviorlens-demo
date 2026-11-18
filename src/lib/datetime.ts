/** ISO timestamp -> value for an <input type="datetime-local"> (local time, minute precision). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local value -> ISO timestamp, or null when the field is empty/invalid. Returning null
 * instead of letting `new Date('').toISOString()` throw RangeError fixes a bug where a
 * cleared field used to make Save silently do nothing.
 */
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
