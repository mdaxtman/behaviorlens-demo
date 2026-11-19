import { describe, expect, it } from 'vitest';
import { backFromState, backState, manageLogHref, studentHref } from './links';

describe('manageLogHref', () => {
  it('links to the data log filtered to one student', () => {
    expect(manageLogHref('abc-123')).toBe('/manage/log?student=abc-123');
  });
});

describe('back target', () => {
  it('round-trips through router state', () => {
    expect(backFromState(backState('/student/abc', 'JoSm'))).toEqual({ to: '/student/abc', label: 'JoSm' });
  });
  it('is absent when the page was opened directly or with unrelated state', () => {
    expect(backFromState(null)).toBeNull();
    expect(backFromState({ back: { to: 5 } })).toBeNull();
  });
});

describe('studentHref', () => {
  it('opens the Record tab by default and names any other tab', () => {
    expect(studentHref('abc')).toBe('/student/abc');
    expect(studentHref('abc', 'record')).toBe('/student/abc');
    expect(studentHref('abc', 'analytics')).toBe('/student/abc?tab=analytics');
  });
});
