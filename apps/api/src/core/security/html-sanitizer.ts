/**
 * Pure HTML sanitizer: strips dangerous tags, script injections, and inline event handlers.
 */
export class HtmlSanitizer {
  private static readonly SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  private static readonly STYLE_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
  private static readonly DISALLOWED_TAGS =
    /<\/?(iframe|object|embed|applet|meta|link|form|input|button)\b[^>]*>/gi;
  private static readonly EVENT_HANDLERS = /\s+on\w+\s*=\s*(['"]).*?\1/gi;
  private static readonly JAVASCRIPT_URLS = /href\s*=\s*(['"])\s*javascript:[^'"]*\1/gi;

  public static sanitize(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;
    // Strip script blocks and their content completely
    sanitized = sanitized.replace(this.SCRIPT_REGEX, '');
    // Strip style blocks and their content
    sanitized = sanitized.replace(this.STYLE_REGEX, '');
    // Strip disallowed tags
    sanitized = sanitized.replace(this.DISALLOWED_TAGS, '');
    // Strip inline on* handlers
    sanitized = sanitized.replace(this.EVENT_HANDLERS, '');
    // Strip javascript: URLs in links
    sanitized = sanitized.replace(this.JAVASCRIPT_URLS, 'href="#"');

    return sanitized.trim();
  }
}
