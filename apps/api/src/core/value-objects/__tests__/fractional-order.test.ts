import { describe, it, expect } from 'vitest';
import { FractionalOrder } from '../fractional-order';

describe('FractionalOrder Value Object', () => {
  it('generates an order key between null and null for first item', () => {
    const key = FractionalOrder.between(null, null);
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('generates an order key strictly between two existing order keys', () => {
    const first = 'a0';
    const second = 'a1';
    const middle = FractionalOrder.between(first, second);

    expect(FractionalOrder.compare(first, middle)).toBe(-1);
    expect(FractionalOrder.compare(middle, second)).toBe(-1);
  });

  it('generates keys before and after existing keys', () => {
    const key = 'a0';
    const before = FractionalOrder.between(null, key);
    const after = FractionalOrder.between(key, null);

    expect(FractionalOrder.compare(before, key)).toBe(-1);
    expect(FractionalOrder.compare(key, after)).toBe(-1);
  });
});
