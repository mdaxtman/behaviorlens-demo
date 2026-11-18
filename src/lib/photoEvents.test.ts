import { describe, expect, it } from 'vitest';
import { notifyPhotoChange, onPhotoChange } from './photoEvents';

describe('photoEvents', () => {
  it('tells every subscriber which student changed', () => {
    const a: string[] = [], b: string[] = [];
    const offA = onPhotoChange(id => a.push(id));
    const offB = onPhotoChange(id => b.push(id));
    notifyPhotoChange('s1');
    expect(a).toEqual(['s1']);
    expect(b).toEqual(['s1']);
    offA(); offB();
  });

  it('stops notifying after unsubscribe (no leaks from unmounted avatars)', () => {
    const seen: string[] = [];
    const off = onPhotoChange(id => seen.push(id));
    off();
    notifyPhotoChange('s2');
    expect(seen).toEqual([]);
  });

  it('a listener that unsubscribes while being notified does not break the others', () => {
    const seen: string[] = [];
    const off1: () => void = onPhotoChange(() => off1());
    const off2 = onPhotoChange(id => seen.push(id));
    notifyPhotoChange('s3');
    expect(seen).toEqual(['s3']);
    off2();
  });
});
