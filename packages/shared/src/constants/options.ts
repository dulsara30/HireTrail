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
  SCREENING = 'SCREENING',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  GHOSTED = 'GHOSTED',
}

export enum ClosedReason {
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
  GHOSTED = 'GHOSTED',
  ACCEPTED_OTHER = 'ACCEPTED_OTHER',
}

export type OptionColor =
  'neutral' | 'accent' | 'info' | 'purple' | 'success' | 'danger' | 'orange' | 'teal';
