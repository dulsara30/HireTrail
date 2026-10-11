export class Cursor {
  public static encode<T extends Record<string, unknown>>(data: T): string {
    const json = JSON.stringify(data);
    return Buffer.from(json, 'utf8').toString('base64url');
  }

  public static decode<T extends Record<string, unknown>>(cursorStr: string): T | null {
    if (!cursorStr || typeof cursorStr !== 'string') {
      return null;
    }

    try {
      const json = Buffer.from(cursorStr, 'base64url').toString('utf8');
      const parsed = JSON.parse(json) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return null;
      }
      return parsed as T;
    } catch {
      return null;
    }
  }
}
