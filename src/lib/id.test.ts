import { afterEach, describe, expect, it, vi } from 'vitest';
import { uuid } from './id';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuid', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a valid v4 uuid when crypto.randomUUID exists', () => {
    expect(uuid()).toMatch(V4);
  });

  it('returns unique values', () => {
    expect(uuid()).not.toBe(uuid());
  });

  it('still returns a valid v4 uuid in an insecure context (no crypto.randomUUID)', () => {
    // Simulate http-over-LAN: getRandomValues is present, randomUUID is not.
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    expect((globalThis.crypto as Crypto).randomUUID).toBeUndefined();
    expect(uuid()).toMatch(V4);
  });
});
