/**
 * Formula-safe CSV escaper preventing CSV injection (Excel / Google Sheets execution).
 */
export class CsvEscaper {
  private static readonly FORMULA_CHARS = ['=', '+', '-', '@', '\t', '\r'];

  public static escapeCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    let str = String(value);

    // If string starts with formula triggers, prepend a single quote to neutralise
    if (this.FORMULA_CHARS.some((char) => str.startsWith(char))) {
      str = `'${str}`;
    }

    // Escape quotes and wrap in quotes if contains delimiter or quote or newline
    const mustQuote = /[",\r\n]/.test(str);
    if (mustQuote) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  public static escapeRow(values: unknown[]): string {
    return values.map((val) => this.escapeCell(val)).join(',');
  }
}
