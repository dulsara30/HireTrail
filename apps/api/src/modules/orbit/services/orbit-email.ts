import { ORBIT_KIND_META, type OrbitKind } from '@hiretrail/shared';

export interface EmailItem {
  title: string;
  kind: OrbitKind;
  /** Already formatted for the reader, for example "Tue 14 Oct, 10:00". */
  when: string;
  context?: string | null;
  overdue?: boolean;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || 'there';

export function itemRows(items: EmailItem[]): string {
  return items
    .map((item) => {
      const meta = ORBIT_KIND_META[item.kind];
      const context = item.context
        ? ` <span style="color:#6b7280">- ${escapeHtml(item.context)}</span>`
        : '';
      const flag = item.overdue ? ' <strong style="color:#b91c1c">overdue</strong>' : '';
      return (
        `<tr><td style="padding:8px 0;border-top:1px solid #e5e7eb">` +
        `<div style="font-size:12px;color:#6b7280">${escapeHtml(meta.label)} &middot; ${escapeHtml(item.when)}${flag}</div>` +
        `<div style="font-size:15px;color:#111827">${escapeHtml(item.title)}${context}</div>` +
        `</td></tr>`
      );
    })
    .join('');
}

function shell(heading: string, intro: string, body: string, appUrl: string): string {
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:16px">` +
    `<h2 style="margin:0 0 4px;font-size:20px;color:#111827">${escapeHtml(heading)}</h2>` +
    `<p style="margin:0 0 12px;color:#4b5563">${escapeHtml(intro)}</p>` +
    `<table style="width:100%;border-collapse:collapse">${body}</table>` +
    `<p style="margin:16px 0 0"><a href="${escapeHtml(appUrl)}/orbit" ` +
    `style="background:#f5c518;color:#111827;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">` +
    `Open Orbit</a></p>` +
    `<p style="margin:16px 0 0;font-size:12px;color:#9ca3af">You get this because email reminders are on in your Orbit settings.</p>` +
    `</div>`
  );
}

export function itemsPlain(items: EmailItem[]): string {
  return items
    .map(
      (i) =>
        `- ${ORBIT_KIND_META[i.kind].label}: ${i.title} (${i.when})${i.overdue ? ' OVERDUE' : ''}`,
    )
    .join('\n');
}

/** One email for the items that just became due. */
export function buildReminderEmail(name: string, items: EmailItem[], appUrl: string): BuiltEmail {
  const first = items[0];
  const subject =
    items.length === 1 && first ? `Reminder: ${first.title}` : `${items.length} reminders are due`;
  return {
    subject,
    html: shell(`Hi ${firstName(name)}`, 'These are due now:', itemRows(items), appUrl),
    text: `Hi ${firstName(name)}, these are due now:\n${itemsPlain(items)}\n\n${appUrl}/orbit`,
  };
}

/** The morning summary: what is overdue and what is coming up. */
export function buildDigestEmail(name: string, items: EmailItem[], appUrl: string): BuiltEmail {
  const overdue = items.filter((i) => i.overdue).length;
  const subject =
    overdue > 0
      ? `Your day: ${items.length} items, ${overdue} overdue`
      : `Your day: ${items.length} item${items.length === 1 ? '' : 's'} coming up`;
  return {
    subject,
    html: shell(
      `Good morning ${firstName(name)}`,
      'Here is what needs you over the next few days:',
      itemRows(items),
      appUrl,
    ),
    text: `Good morning ${firstName(name)}. Here is what needs you:\n${itemsPlain(items)}\n\n${appUrl}/orbit`,
  };
}
