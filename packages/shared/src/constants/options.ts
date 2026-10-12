export enum OptionType {
  STATUS = 'STATUS',
  PRIORITY = 'PRIORITY',
  LABEL = 'LABEL',
  WORK_MODE = 'WORK_MODE',
  JOB_TYPE = 'JOB_TYPE',
  LEVEL = 'LEVEL',
  SOURCE = 'SOURCE',
  CV_VERSION = 'CV_VERSION',
}

export enum StatusCategory {
  SAVED = 'SAVED',
  APPLIED = 'APPLIED',
  IN_PROGRESS = 'IN_PROGRESS',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  ACCEPTED = 'ACCEPTED',
  CLOSED = 'CLOSED',
}

export enum ClosedReason {
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  DECLINED = 'DECLINED',
  GHOSTED = 'GHOSTED',
  OTHER = 'OTHER',
}

/**
 * Maps a stored status meta (possibly from the older category set) to the current
 * category + closed reason, so existing data keeps working without a migration.
 */
export function normalizeStatusMeta(meta?: { category?: unknown; closedReason?: unknown }): {
  category: StatusCategory;
  closedReason?: ClosedReason;
} {
  const raw = String(meta?.category ?? '');
  const reason = String(meta?.closedReason ?? '');
  const reasons = Object.values(ClosedReason) as string[];
  const explicit = reasons.includes(reason) ? (reason as ClosedReason) : undefined;
  switch (raw) {
    case 'SCREENING':
      return { category: StatusCategory.IN_PROGRESS };
    case 'REJECTED':
      return { category: StatusCategory.CLOSED, closedReason: ClosedReason.REJECTED };
    case 'GHOSTED':
      return { category: StatusCategory.CLOSED, closedReason: ClosedReason.GHOSTED };
    case StatusCategory.CLOSED:
      return { category: StatusCategory.CLOSED, closedReason: explicit ?? ClosedReason.OTHER };
    default:
      return (Object.values(StatusCategory) as string[]).includes(raw)
        ? { category: raw as StatusCategory }
        : { category: StatusCategory.SAVED };
  }
}

export type OptionColor =
  | 'neutral'
  | 'accent'
  | 'info'
  | 'purple'
  | 'success'
  | 'danger'
  | 'orange'
  | 'teal'
  | 'pink'
  | 'lime'
  | 'sky'
  | 'indigo';
