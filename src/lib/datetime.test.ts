import { describe, expect, it } from 'vitest';
import { fromLocalInput, toLocalInput } from './datetime';

describe('datetime-local helpers', () => {
  it('round-trips an ISO timestamp through the input format at minute precision', () => {
    const iso = new Date(2026, 8, 30, 14, 7).toISOString();
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });
  it('returns null for a cleared or garbage field instead of throwing RangeError', () => {
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('not-a-date')).toBeNull();
  });
});
