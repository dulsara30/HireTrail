import { describe, it, expect } from 'vitest';
import { Cursor } from '../cursor';

describe('Cursor Value Object', () => {
  it('encodes and decodes pagination payload correctly', () => {
    const payload = { _id: '65f1a9b2c3d4e5f6a7b8c9d0', timestamp: 1710000000 };
    const encoded = Cursor.encode(payload);

    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = Cursor.decode<typeof payload>(encoded);
    expect(decoded).toEqual(payload);
  });

  it('returns null when decoding invalid or tampered cursor strings', () => {
    expect(Cursor.decode('not-valid-base64-json!')).toBeNull();
    expect(Cursor.decode('')).toBeNull();
    // Non-object JSON
    const primitiveEncoded = Buffer.from('12345').toString('base64url');
    expect(Cursor.decode(primitiveEncoded)).toBeNull();
  });
});
