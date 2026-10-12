import { ApplicationDoc } from '../models/application.model';

export interface HistoryDiffChange {
  field: string;
  from?: unknown;
  to?: unknown;
  changed?: boolean;
}

export class HistoryDiff {
  public static computeDiff(
    before: Partial<ApplicationDoc>,
    after: Partial<ApplicationDoc>,
    optionLabelLookup: (id: string) => string | undefined = () => undefined,
  ): HistoryDiffChange[] {
    const changes: HistoryDiffChange[] = [];

    // Simple fields
    const simpleFields: Array<keyof ApplicationDoc> = [
      'roleTitle',
      'companyName',
      'location',
      'jobUrl',
    ];

    for (const field of simpleFields) {
      if (before[field] !== after[field] && (before[field] || after[field])) {
        changes.push({
          field: String(field),
          from: before[field] ?? null,
          to: after[field] ?? null,
        });
      }
    }

    // Boolean field, shown with a human label and Yes/No values
    if (Boolean(before.coverLetter) !== Boolean(after.coverLetter)) {
      changes.push({
        field: 'coverLetter',
        from: before.coverLetter ? 'Yes' : 'No',
        to: after.coverLetter ? 'Yes' : 'No',
      });
    }

    // Option fields
    const optionFields: Array<keyof ApplicationDoc> = [
      'statusId',
      'priorityId',
      'workModeId',
      'jobTypeId',
      'levelId',
      'sourceId',
      'cvVersionId',
    ];

    for (const field of optionFields) {
      const fromVal = before[field]?.toString();
      const toVal = after[field]?.toString();
      if (fromVal !== toVal) {
        changes.push({
          field: String(field).replace('Id', ''),
          from: fromVal ? { id: fromVal, label: optionLabelLookup(fromVal) || 'Option' } : null,
          to: toVal ? { id: toVal, label: optionLabelLookup(toVal) || 'Option' } : null,
        });
      }
    }

    // Rich text fields: record only character counts / changed: true per docs
    if (before.notesHtml !== after.notesHtml && (before.notesHtml || after.notesHtml)) {
      changes.push({
        field: 'notes',
        changed: true,
        from: before.notesHtml ? before.notesHtml.length : 0,
        to: after.notesHtml ? after.notesHtml.length : 0,
      });
    }

    if (
      before.jobDescription?.html !== after.jobDescription?.html &&
      (before.jobDescription?.html || after.jobDescription?.html)
    ) {
      changes.push({
        field: 'jobDescription',
        changed: true,
        from: before.jobDescription?.html ? before.jobDescription.html.length : 0,
        to: after.jobDescription?.html ? after.jobDescription.html.length : 0,
      });
    }

    return changes;
  }
}
