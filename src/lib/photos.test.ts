import { describe, it, expect } from 'vitest';
import { dataUrlToBlob, exportPhotos, importPhotos } from './photos';

describe('photos', () => {
  it('decodes a base64 data URL into a typed blob', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,' + btoa('hi!'));
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(3);
  });

  it('round-trips photos through export and import', async () => {
    await importPhotos({ p1: 'data:image/jpeg;base64,' + btoa('jpeg-bytes') });
    const out = await exportPhotos();
    expect(out.p1).toMatch(/^data:image\/jpeg;base64,/);
    expect(atob(out.p1.split(',')[1])).toBe('jpeg-bytes');
  });
});
