import { type ApplicationDoc } from '../models/application.model';

/** Human labels are the CSV headers (docs/01-product-requirements.md §9). */
export const CSV_HEADERS = [
  'Company',
  'Role Title',
  'Status',
  'Priority',
  'Labels',
  'Work Mode',
  'Job Type',
  'Level',
  'Source',
  'CV Version',
  'Cover Letter',
  'Location',
  'Job Link',
  'Contact Email',
  'Resume Link',
  'Salary Min',
  'Salary Max',
  'Salary Currency',
  'Salary Period',
  'Expected Salary',
  'Saved Date',
  'Applied Date',
  'Deadline',
  'Follow-up Date',
  'Next Interview',
  'Job Description',
  'Notes',
  'Created',
  'Updated',
] as const;

const day = (d?: Date | null): string => (d ? d.toISOString().slice(0, 10) : '');
const money = (minor?: number | null): string =>
  minor === null || minor === undefined ? '' : (minor / 100).toFixed(2);

export function htmlToPlainText(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

/** One CSV row (raw values; the CsvEscaper makes them formula-safe when written). */
export function applicationToCsvValues(
  app: ApplicationDoc,
  label: (id?: { toString(): string } | null) => string,
): unknown[] {
  return [
    app.companyName,
    app.roleTitle,
    label(app.statusId),
    label(app.priorityId),
    (app.labelIds ?? []).map((id) => label(id)).join('; '),
    label(app.workModeId),
    label(app.jobTypeId),
    label(app.levelId),
    label(app.sourceId),
    label(app.cvVersionId),
    app.coverLetter ? 'Yes' : 'No',
    app.location ?? '',
    app.jobUrl ?? '',
    app.contactEmail ?? '',
    app.resumeUrl ?? '',
    money(app.salary?.min),
    money(app.salary?.max),
    app.salary?.currency ?? '',
    app.salary?.period ?? '',
    money(app.salary?.expected),
    day(app.dates?.savedAt),
    day(app.dates?.appliedAt),
    day(app.dates?.deadlineAt),
    day(app.dates?.followUpAt),
    day(app.dates?.nextInterviewAt),
    app.jobDescription?.text ?? htmlToPlainText(app.jobDescription?.html),
    htmlToPlainText(app.notesHtml),
    app.createdAt.toISOString(),
    app.updatedAt.toISOString(),
  ];
}
