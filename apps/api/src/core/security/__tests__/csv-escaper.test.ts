import { describe, it, expect } from 'vitest';
import { CsvEscaper } from '../csv-escaper';

describe('CsvEscaper', () => {
  it('escapes cells starting with formula characters', () => {
    expect(CsvEscaper.escapeCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(CsvEscaper.escapeCell('+12345')).toBe("'+12345");
    expect(CsvEscaper.escapeCell('-CMD')).toBe("'-CMD");
    expect(CsvEscaper.escapeCell('@special')).toBe("'@special");
    expect(CsvEscaper.escapeCell('\ttab')).toBe("'\ttab");
  });

  it('escapes quotes and handles commas and newlines', () => {
    expect(CsvEscaper.escapeCell('Hello, World')).toBe('"Hello, World"');
    expect(CsvEscaper.escapeCell('Quote: "value"')).toBe('"Quote: ""value"""');
    expect(CsvEscaper.escapeCell('Line1\nLine2')).toBe('"Line1\nLine2"');
  });

  it('returns empty string for null and undefined', () => {
    expect(CsvEscaper.escapeCell(null)).toBe('');
    expect(CsvEscaper.escapeCell(undefined)).toBe('');
  });

  it('correctly escapes an entire CSV row', () => {
    const row = ['Frontend Engineer', '=1+1', 'Google, Inc.', 100000];
    expect(CsvEscaper.escapeRow(row)).toBe('Frontend Engineer,\'=1+1,"Google, Inc.",100000');
  });
});
