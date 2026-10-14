import { describe, expect, it } from 'vitest';
import { buildDigestEmail, buildReminderEmail, escapeHtml } from '../services/orbit-email';
import { requireCronSecret } from '../orbit-cron.routes';

describe('orbit emails', () => {
  it('escapes text so a title cannot inject markup', () => {
    expect(escapeHtml('<script>alert("x")</script> & co')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co',
    );
    const email = buildReminderEmail(
      'Sam <b>',
      [{ title: '<img src=x onerror=alert(1)>', kind: 'TASK', when: 'Tue 14 Oct' }],
      'https://app.example',
    );
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;img');
    expect(email.html).toContain('https://app.example/orbit');
  });

  it('words the subject for one reminder, several reminders and the digest', () => {
    const one = buildReminderEmail(
      'Sam Lee',
      [{ title: 'Call Sysco', kind: 'CALL', when: '10:00' }],
      'https://app.example',
    );
    expect(one.subject).toBe('Reminder: Call Sysco');
    expect(one.html).toContain('Hi Sam');

    const many = buildReminderEmail(
      'Sam',
      [
        { title: 'A', kind: 'TASK', when: 'x' },
        { title: 'B', kind: 'REMINDER', when: 'y' },
      ],
      'https://app.example',
    );
    expect(many.subject).toBe('2 reminders are due');

    const digest = buildDigestEmail(
      'Sam',
      [
        { title: 'Late thing', kind: 'DEADLINE', when: 'Mon', overdue: true },
        { title: 'Soon', kind: 'TASK', when: 'Fri' },
      ],
      'https://app.example',
    );
    expect(digest.subject).toBe('Your day: 2 items, 1 overdue');
    expect(digest.text).toContain('OVERDUE');
  });
});

describe('requireCronSecret', () => {
  const run = (secret: string | undefined, header?: string) => {
    let result: unknown = 'not called';
    requireCronSecret(secret)(
      { header: () => header } as never,
      {} as never,
      ((err?: unknown) => {
        result = err ?? 'ok';
      }) as never,
    );
    return result;
  };
  const secret = 'a-long-random-secret-value';

  it('lets the right bearer secret through', () => {
    expect(run(secret, `Bearer ${secret}`)).toBe('ok');
  });

  it('rejects a wrong, missing or malformed secret', () => {
    expect((run(secret, 'Bearer nope') as { status: number }).status).toBe(401);
    expect((run(secret, undefined) as { status: number }).status).toBe(401);
    expect((run(secret, secret) as { status: number }).status).toBe(401);
  });

  it('refuses everything when no secret is configured', () => {
    expect((run(undefined, 'Bearer anything') as { status: number }).status).toBe(403);
  });
});
