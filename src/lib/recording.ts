import type { Behavior } from './types';

/**
 * One incident = one event. A behavior therefore gets exactly ONE primary trigger; the
 * other tracked dimensions become attributes captured onto that same event rather than
 * separate controls that would each create their own event (which double/triple-counted
 * frequency for multi-dimension behaviors).
 *
 * - 'timer'  — the stop marks the occurrence, so a separate +1 would be redundant.
 * - 'rating' — each intensity tap records one occurrence at that intensity.
 * - 'count'  — plain +1.
 */
export type Trigger = 'timer' | 'rating' | 'count';

export function primaryTrigger(b: Behavior): Trigger {
  if (b.track_duration) return 'timer';
  if (b.track_rating) return 'rating';
  return 'count';
}

/** Attributes still to collect after the trigger fires — excluding what it already supplied. */
export function captureAfterTrigger(b: Behavior): { rating: boolean; abc: boolean } {
  return {
    rating: b.track_rating && primaryTrigger(b) !== 'rating',
    abc: b.requires_abc,
  };
}

/** Whether the trigger must open the capture sheet before the event can be saved. */
export function needsCaptureSheet(b: Behavior): boolean {
  const f = captureAfterTrigger(b);
  return f.rating || f.abc;
}
