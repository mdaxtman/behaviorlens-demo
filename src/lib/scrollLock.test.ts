// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('lockScroll', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('document', {
      documentElement: { style: { overflow: 'auto' } }, body: { style: { overflow: '' } },
    });
  });

  it('hides page overflow while locked and restores what was there', async () => {
    const { lockScroll } = await import('./scrollLock');
    const unlock = lockScroll();
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    unlock();
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(document.body.style.overflow).toBe('');
  });

  it('stays locked until every stacked sheet has released it', async () => {
    const { lockScroll } = await import('./scrollLock');
    const first = lockScroll();
    const second = lockScroll();
    second();
    expect(document.documentElement.style.overflow).toBe('hidden');
    first();
    expect(document.documentElement.style.overflow).toBe('auto');
  });

  it('ignores a release that is called twice', async () => {
    const { lockScroll } = await import('./scrollLock');
    const first = lockScroll();
    const second = lockScroll();
    second();
    second();
    expect(document.documentElement.style.overflow).toBe('hidden');
    first();
  });
});
