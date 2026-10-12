export class RedirectGuard {
  public static isValidRelativePath(path: string | undefined | null): boolean {
    if (!path || typeof path !== 'string') {
      return false;
    }

    // Must start with a single slash
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
      return false;
    }

    // Must not contain scheme delimiter
    if (path.includes('://')) {
      return false;
    }

    // Must not contain backslashes that some browsers interpret as domain separators
    if (path.includes('\\')) {
      return false;
    }

    return true;
  }

  public static sanitizeRedirectPath(
    path: string | undefined | null,
    fallback = '/pipeline',
  ): string {
    if (this.isValidRelativePath(path)) {
      return path as string;
    }
    return fallback;
  }
}

export const sanitizeRedirectPath = RedirectGuard.sanitizeRedirectPath.bind(RedirectGuard);
export const isValidRelativePath = RedirectGuard.isValidRelativePath.bind(RedirectGuard);
