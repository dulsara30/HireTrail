import { describe, it, expect } from 'vitest';
import { RedirectGuard } from '../redirect-guard';

describe('RedirectGuard', () => {
  it('accepts safe relative paths', () => {
    expect(RedirectGuard.isValidRelativePath('/pipeline')).toBe(true);
    expect(RedirectGuard.isValidRelativePath('/applications/123')).toBe(true);
    expect(RedirectGuard.isValidRelativePath('/settings/profile?tab=security')).toBe(true);
  });

  it('rejects protocol-relative URLs and path traversal tricks', () => {
    expect(RedirectGuard.isValidRelativePath('//malicious.com')).toBe(false);
    expect(RedirectGuard.isValidRelativePath('/\\malicious.com')).toBe(false);
    expect(RedirectGuard.isValidRelativePath('/path\\to\\somewhere')).toBe(false);
  });

  it('rejects absolute URLs with schemes', () => {
    expect(RedirectGuard.isValidRelativePath('https://evil.com')).toBe(false);
    expect(RedirectGuard.isValidRelativePath('http://localhost')).toBe(false);
    expect(RedirectGuard.isValidRelativePath('javascript:alert(1)')).toBe(false);
  });

  it('sanitizes and provides fallback for invalid redirect paths', () => {
    expect(RedirectGuard.sanitizeRedirectPath('/valid', '/fallback')).toBe('/valid');
    expect(RedirectGuard.sanitizeRedirectPath('https://evil.com', '/fallback')).toBe('/fallback');
    expect(RedirectGuard.sanitizeRedirectPath(null, '/fallback')).toBe('/fallback');
  });
});
