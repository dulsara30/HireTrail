import { describe, it, expect } from 'vitest';
import { HtmlSanitizer } from '../html-sanitizer';

describe('HtmlSanitizer', () => {
  it('strips script and iframe tags', () => {
    const raw = '<p>Hello</p><script>alert("xss")</script><iframe src="evil.com"></iframe>';
    expect(HtmlSanitizer.sanitize(raw)).toBe('<p>Hello</p>');
  });

  it('removes inline event handlers', () => {
    const raw =
      '<img src="cat.jpg" onload="evil()" onerror="steal()" /><p onclick="click()">Text</p>';
    expect(HtmlSanitizer.sanitize(raw)).toBe('<img src="cat.jpg" /><p>Text</p>');
  });

  it('neutralizes javascript: URLs in links', () => {
    const raw = '<a href="javascript:alert(1)">Click me</a>';
    expect(HtmlSanitizer.sanitize(raw)).toBe('<a href="#">Click me</a>');
  });

  it('leaves safe HTML formatting intact', () => {
    const safe = '<h3>Job Title</h3><p>We are looking for a <strong>Senior Engineer</strong>.</p>';
    expect(HtmlSanitizer.sanitize(safe)).toBe(safe);
  });
});
