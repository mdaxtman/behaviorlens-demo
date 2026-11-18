import { describe, expect, it } from 'vitest';
import { captureAfterTrigger, needsCaptureSheet, primaryTrigger } from './recording';
import type { Behavior } from './types';

function bh(partial: Partial<Behavior>): Behavior {
  return {
    id: 'b1', student_id: 's1', name: 'Aggression', description: null,
    category: 'challenging', track_frequency: true, track_duration: false,
    track_rating: false, requires_abc: false, active: true, created_at: '',
    ...partial,
  };
}

describe('primaryTrigger', () => {
  it('is a single trigger per behavior so one incident is never split across events', () => {
    // Duration wins: the timer already marks the occurrence, so a separate +1 is redundant.
    expect(primaryTrigger(bh({ track_duration: true, track_frequency: true, track_rating: true })))
      .toBe('timer');
    // Rating next: each intensity tap records one occurrence at that intensity.
    expect(primaryTrigger(bh({ track_rating: true, track_frequency: true }))).toBe('rating');
    // Plain count otherwise.
    expect(primaryTrigger(bh({ track_frequency: true }))).toBe('count');
    // No dimensions configured still yields a usable trigger.
    expect(primaryTrigger(bh({ track_frequency: false }))).toBe('count');
  });
});

describe('captureAfterTrigger', () => {
  it('does not re-ask for the attribute the trigger already supplied', () => {
    // Rating trigger supplies the rating itself.
    expect(captureAfterTrigger(bh({ track_rating: true }))).toEqual({ rating: false, abc: false });
    // Timer trigger does not, so rating must still be collected.
    expect(captureAfterTrigger(bh({ track_duration: true, track_rating: true })))
      .toEqual({ rating: true, abc: false });
  });

  it('always collects ABC when the behavior requires it', () => {
    expect(captureAfterTrigger(bh({ requires_abc: true }))).toEqual({ rating: false, abc: true });
    expect(captureAfterTrigger(bh({ track_rating: true, requires_abc: true })))
      .toEqual({ rating: false, abc: true });
  });
});

describe('needsCaptureSheet', () => {
  it('is false for single-dimension behaviors without ABC (preserves 2-tap logging)', () => {
    expect(needsCaptureSheet(bh({ track_frequency: true }))).toBe(false);
    expect(needsCaptureSheet(bh({ track_duration: true }))).toBe(false);
    expect(needsCaptureSheet(bh({ track_rating: true }))).toBe(false);
    // Frequency + rating: the intensity chip is the trigger, so still no sheet.
    expect(needsCaptureSheet(bh({ track_frequency: true, track_rating: true }))).toBe(false);
  });

  it('is true when an attribute remains to collect after the trigger', () => {
    expect(needsCaptureSheet(bh({ requires_abc: true }))).toBe(true);
    expect(needsCaptureSheet(bh({ track_duration: true, track_rating: true }))).toBe(true);
  });
});
