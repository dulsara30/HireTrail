import { describe, expect, it } from 'vitest';
import { emailFormError, emailFormFor, toPreviewPayload, toSendPayload } from './email-form';

describe('email form helpers', () => {
  it('starts from the template wording', () => {
    const form = emailFormFor('MARKETING');
    expect(form.template).toBe('MARKETING');
    expect(form.subject).toContain('PRO');
    expect(form.ctaUrl).toBe('');
  });

  it('leaves empty optional fields out of the payload', () => {
    const payload = toPreviewPayload({ ...emailFormFor('GENERAL'), heading: '  ', ctaLabel: '' });
    expect(payload.heading).toBeUndefined();
    expect(payload.ctaLabel).toBeUndefined();
    expect(payload.subject).toBe('A message from HireTrail');
  });

  it('adds the recipients when sending', () => {
    const payload = toSendPayload(emailFormFor('GENERAL'), ['a'.repeat(24)]);
    expect(payload.userIds).toEqual(['a'.repeat(24)]);
  });

  it('accepts the defaults and explains what is wrong otherwise', () => {
    expect(emailFormError(emailFormFor('FEATURE_ANNOUNCEMENT'))).toBeNull();
    expect(emailFormError({ ...emailFormFor('GENERAL'), subject: ' ' })).toMatch(/subject/i);
    expect(emailFormError({ ...emailFormFor('GENERAL'), message: '' })).toMatch(/message/i);
    expect(emailFormError({ ...emailFormFor('GENERAL'), ctaUrl: 'ftp://x' })).toMatch(/http/i);
  });

  it('does not need a message for the due tasks template', () => {
    expect(emailFormError(emailFormFor('DUE_TASKS'))).toBeNull();
  });
});
