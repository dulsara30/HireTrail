import { describe, expect, it } from 'vitest';
import { mapPickedDoc } from './google-picker';

describe('mapPickedDoc', () => {
  it('maps a Drive file to its link and name', () => {
    expect(
      mapPickedDoc({ name: ' CV 2026.pdf ', url: 'https://drive.google.com/file/d/abc/view' }),
    ).toEqual({ url: 'https://drive.google.com/file/d/abc/view', name: 'CV 2026.pdf' });
  });

  it('accepts Google Docs links', () => {
    expect(
      mapPickedDoc({ name: 'CV', url: 'https://docs.google.com/document/d/abc/edit' }),
    ).not.toBeNull();
  });

  it('rejects other hosts, insecure links and missing urls', () => {
    expect(mapPickedDoc({ name: 'x', url: 'https://evil.example.com/file' })).toBeNull();
    expect(mapPickedDoc({ name: 'x', url: 'http://drive.google.com/file/d/abc' })).toBeNull();
    expect(mapPickedDoc({ name: 'x' })).toBeNull();
    expect(mapPickedDoc(undefined)).toBeNull();
  });

  it('trims the name to 200 characters', () => {
    const file = mapPickedDoc({
      name: 'a'.repeat(300),
      url: 'https://drive.google.com/file/d/abc',
    });
    expect(file?.name).toHaveLength(200);
  });
});
