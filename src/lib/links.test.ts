import { describe, expect, it } from 'vitest';
import { manageLogHref, manageNewHref } from './links';

describe('manageNewHref', () => {
  it('builds a preselect-and-open link for each manage screen', () => {
    expect(manageNewHref('behaviors', 'abc-123')).toBe('/manage/behaviors?student=abc-123&new=1');
    expect(manageNewHref('goals', 'abc-123')).toBe('/manage/goals?student=abc-123&new=1');
  });
});

describe('manageLogHref', () => {
  it('links to the data log filtered to one student', () => {
    expect(manageLogHref('abc-123')).toBe('/manage/log?student=abc-123');
  });
});
