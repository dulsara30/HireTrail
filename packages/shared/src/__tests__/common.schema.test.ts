import { describe, it, expect } from 'vitest';
import {
  objectIdSchema,
  cursorPaginationSchema,
  urlSchema,
  moneySchema,
} from '../schemas/common.schema';

describe('Common Schemas', () => {
  describe('objectIdSchema', () => {
    it('accepts valid 24-char hex strings', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(objectIdSchema.isValidSync(validId)).toBe(true);
    });

    it('rejects invalid hex strings and wrong lengths', () => {
      expect(objectIdSchema.isValidSync('invalid-id')).toBe(false);
      expect(objectIdSchema.isValidSync('507f1f77bcf86cd79943901')).toBe(false); // 23 chars
      expect(objectIdSchema.isValidSync('507f1f77bcf86cd799439011zz')).toBe(false); // non-hex
    });
  });

  describe('cursorPaginationSchema', () => {
    it('applies default limit and allows cursor', () => {
      const parsed = cursorPaginationSchema.validateSync({ cursor: 'cur_123' });
      expect(parsed.limit).toBe(25);
      expect(parsed.cursor).toBe('cur_123');
    });

    it('clamps limit to maximum 100', () => {
      expect(() => cursorPaginationSchema.validateSync({ limit: 150 })).toThrow();
    });

    it('rejects negative or zero limit', () => {
      expect(() => cursorPaginationSchema.validateSync({ limit: 0 })).toThrow();
    });
  });

  describe('urlSchema', () => {
    it('accepts valid http and https URLs', () => {
      expect(urlSchema.isValidSync('https://example.com/jobs/1')).toBe(true);
      expect(urlSchema.isValidSync('http://localhost:3000')).toBe(true);
    });

    it('rejects javascript: and file: URLs', () => {
      expect(urlSchema.isValidSync('javascript:alert(1)')).toBe(false);
      expect(urlSchema.isValidSync('file:///etc/passwd')).toBe(false);
      expect(urlSchema.isValidSync('ftp://example.com')).toBe(false);
    });
  });

  describe('moneySchema', () => {
    it('accepts integer amount and 3-letter currency', () => {
      expect(
        moneySchema.isValidSync({
          amount: 500000,
          currency: 'USD',
        }),
      ).toBe(true);
    });

    it('rejects decimal amounts and invalid currencies', () => {
      expect(
        moneySchema.isValidSync({
          amount: 12.5,
          currency: 'USD',
        }),
      ).toBe(false);

      expect(
        moneySchema.isValidSync({
          amount: 5000,
          currency: 'us',
        }),
      ).toBe(false);
    });
  });
});
