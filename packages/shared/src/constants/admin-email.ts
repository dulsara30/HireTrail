export const ADMIN_EMAIL_TEMPLATES = [
  'GENERAL',
  'MARKETING',
  'FEATURE_ANNOUNCEMENT',
  'DUE_TASKS',
] as const;
export type AdminEmailTemplate = (typeof ADMIN_EMAIL_TEMPLATES)[number];

/** Most recipients one send can have (the mail provider limits how fast mail can go out). */
export const ADMIN_EMAIL_MAX_RECIPIENTS = 20;

export interface AdminEmailTemplateMeta {
  label: string;
  description: string;
  defaultSubject: string;
  defaultHeading: string;
  defaultMessage: string;
  defaultCtaLabel: string;
  /** The message is optional because the body is built from each person's own due items. */
  generatedBody: boolean;
}

export const ADMIN_EMAIL_TEMPLATE_META: Record<AdminEmailTemplate, AdminEmailTemplateMeta> = {
  GENERAL: {
    label: 'General',
    description: 'A plain message from the HireTrail team.',
    defaultSubject: 'A message from HireTrail',
    defaultHeading: 'Hello from HireTrail',
    defaultMessage: 'Write your message here.',
    defaultCtaLabel: 'Open HireTrail',
    generatedBody: false,
  },
  MARKETING: {
    label: 'Marketing',
    description: 'An offer or a nudge, for example upgrading to PRO.',
    defaultSubject: 'Get more from HireTrail with PRO',
    defaultHeading: 'Land your next role faster',
    defaultMessage:
      'PRO unlocks unlimited Orbit tasks, company watch, email reminders and a daily digest.\n\nUpgrade today and keep every follow-up on track.',
    defaultCtaLabel: 'See PRO',
    generatedBody: false,
  },
  FEATURE_ANNOUNCEMENT: {
    label: 'New feature',
    description: 'Tell people about something new.',
    defaultSubject: 'New in HireTrail',
    defaultHeading: 'Something new is here',
    defaultMessage:
      'We just shipped a new feature.\n\nDescribe what it does and why it helps in a sentence or two.',
    defaultCtaLabel: 'Try it now',
    generatedBody: false,
  },
  DUE_TASKS: {
    label: 'Due tasks',
    description:
      'Each person gets their own overdue and due Orbit items. People with none are skipped.',
    defaultSubject: 'You have tasks that need attention',
    defaultHeading: 'Your due tasks',
    defaultMessage: '',
    defaultCtaLabel: 'Open Orbit',
    generatedBody: true,
  },
};
