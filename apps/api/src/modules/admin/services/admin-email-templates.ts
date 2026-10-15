import { ADMIN_EMAIL_TEMPLATE_META, type AdminEmailTemplate } from '@hiretrail/shared';
import {
  escapeHtml,
  itemRows,
  itemsPlain,
  type BuiltEmail,
  type EmailItem,
} from '../../orbit/services/orbit-email';

export interface AdminEmailContent {
  template: AdminEmailTemplate;
  subject: string;
  heading?: string;
  message?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || 'there';

/** Blank lines start a new paragraph; single line breaks stay inside the paragraph. */
const paragraphs = (message: string): string[] =>
  message
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const messageHtml = (message: string): string =>
  paragraphs(message)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#374151">${escapeHtml(p).replace(/\r?\n/g, '<br>')}</p>`,
    )
    .join('');

/** A small label above the heading that tells the reader what kind of email this is. */
const BADGE: Partial<Record<AdminEmailTemplate, { text: string; background: string }>> = {
  MARKETING: { text: 'HireTrail PRO', background: '#f5c518' },
  FEATURE_ANNOUNCEMENT: { text: 'New', background: '#bbf7d0' },
  DUE_TASKS: { text: 'Due now', background: '#fecaca' },
};

const FOOTER: Record<AdminEmailTemplate, string> = {
  GENERAL: 'You are receiving this because you have a HireTrail account.',
  MARKETING: 'You are receiving this because you have a HireTrail account.',
  FEATURE_ANNOUNCEMENT: 'You are receiving this because you have a HireTrail account.',
  DUE_TASKS: 'The HireTrail team sent you this summary of your own due tasks.',
};

/**
 * Builds the email for one person. Pure: the same input always gives the same output.
 * `dueItems` is only used by the DUE_TASKS template.
 */
export function buildAdminEmail(
  content: AdminEmailContent,
  recipientName: string,
  appUrl: string,
  dueItems: EmailItem[] = [],
): BuiltEmail {
  const meta = ADMIN_EMAIL_TEMPLATE_META[content.template];
  const heading = content.heading?.trim() || meta.defaultHeading;
  const message = content.message?.trim() ?? '';
  const ctaLabel = content.ctaLabel?.trim() || meta.defaultCtaLabel;
  const ctaUrl =
    content.ctaUrl?.trim() || (content.template === 'DUE_TASKS' ? `${appUrl}/orbit` : appUrl);
  const badge = BADGE[content.template];

  const badgeHtml = badge
    ? `<span style="display:inline-block;margin:0 0 8px;padding:3px 10px;border-radius:999px;background:${badge.background};font-size:12px;font-weight:bold;color:#111827">${escapeHtml(badge.text)}</span>`
    : '';
  const items =
    content.template === 'DUE_TASKS'
      ? `<table style="width:100%;border-collapse:collapse;margin:0 0 12px">${itemRows(dueItems)}</table>`
      : '';

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:16px">` +
    badgeHtml +
    `<h2 style="margin:0 0 12px;font-size:22px;color:#111827">${escapeHtml(heading)}</h2>` +
    `<p style="margin:0 0 12px;font-size:15px;color:#374151">Hi ${escapeHtml(firstName(recipientName))},</p>` +
    messageHtml(message) +
    items +
    `<p style="margin:16px 0 0"><a href="${escapeHtml(ctaUrl)}" ` +
    `style="background:#f5c518;color:#111827;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">` +
    `${escapeHtml(ctaLabel)}</a></p>` +
    `<p style="margin:20px 0 0;font-size:12px;color:#9ca3af">${escapeHtml(FOOTER[content.template])}</p>` +
    `</div>`;

  const text = [
    heading,
    '',
    `Hi ${firstName(recipientName)},`,
    '',
    ...(message ? [paragraphs(message).join('\n\n'), ''] : []),
    ...(content.template === 'DUE_TASKS' && dueItems.length > 0 ? [itemsPlain(dueItems), ''] : []),
    `${ctaLabel}: ${ctaUrl}`,
    '',
    FOOTER[content.template],
  ].join('\n');

  return { subject: content.subject.trim(), html, text };
}
