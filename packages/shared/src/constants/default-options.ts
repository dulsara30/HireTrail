import { OptionType, StatusCategory, type OptionColor } from './options';

export interface DefaultOptionDefinition {
  type: OptionType;
  key: string;
  label: string;
  color: OptionColor;
  order: string;
  meta?: Record<string, unknown>;
  aliases?: string[];
}

export const DEFAULT_OPTIONS: DefaultOptionDefinition[] = [
  // Statuses
  {
    type: OptionType.STATUS,
    key: 'saved',
    label: 'Saved',
    color: 'neutral',
    order: 'a0',
    meta: { category: StatusCategory.SAVED },
    aliases: ['wishlist', 'bookmarked'],
  },
  {
    type: OptionType.STATUS,
    key: 'applied',
    label: 'Applied',
    color: 'accent',
    order: 'a1',
    meta: { category: StatusCategory.APPLIED },
    aliases: ['submitted'],
  },
  {
    type: OptionType.STATUS,
    key: 'screening',
    label: 'Screening',
    color: 'info',
    order: 'a2',
    meta: { category: StatusCategory.SCREENING },
    aliases: ['recruiter call', 'hr screen'],
  },
  {
    type: OptionType.STATUS,
    key: 'interview',
    label: 'Interview',
    color: 'purple',
    order: 'a3',
    meta: { category: StatusCategory.INTERVIEW },
    aliases: ['technical interview', 'onsite'],
  },
  {
    type: OptionType.STATUS,
    key: 'offer',
    label: 'Offer',
    color: 'success',
    order: 'a4',
    meta: { category: StatusCategory.OFFER },
    aliases: ['offered'],
  },
  {
    type: OptionType.STATUS,
    key: 'rejected',
    label: 'Rejected',
    color: 'danger',
    order: 'a5',
    meta: { category: StatusCategory.REJECTED },
    aliases: ['declined'],
  },
  {
    type: OptionType.STATUS,
    key: 'ghosted',
    label: 'Ghosted',
    color: 'neutral',
    order: 'a6',
    meta: { category: StatusCategory.GHOSTED },
    aliases: ['no response'],
  },

  // Priorities
  {
    type: OptionType.PRIORITY,
    key: 'low',
    label: 'Low',
    color: 'neutral',
    order: 'a0',
    meta: { rank: 1 },
  },
  {
    type: OptionType.PRIORITY,
    key: 'medium',
    label: 'Medium',
    color: 'info',
    order: 'a1',
    meta: { rank: 2 },
  },
  {
    type: OptionType.PRIORITY,
    key: 'high',
    label: 'High',
    color: 'accent',
    order: 'a2',
    meta: { rank: 3 },
  },
  {
    type: OptionType.PRIORITY,
    key: 'dream',
    label: 'Dream',
    color: 'orange',
    order: 'a3',
    meta: { rank: 4 },
  },

  // Work Modes
  {
    type: OptionType.WORK_MODE,
    key: 'remote',
    label: 'Remote',
    color: 'teal',
    order: 'a0',
    aliases: ['wfh', 'work from home', 'telecommute'],
  },
  {
    type: OptionType.WORK_MODE,
    key: 'hybrid',
    label: 'Hybrid',
    color: 'purple',
    order: 'a1',
    aliases: ['flexible', 'partially remote'],
  },
  {
    type: OptionType.WORK_MODE,
    key: 'on_site',
    label: 'On-site',
    color: 'neutral',
    order: 'a2',
    aliases: ['office', 'in-person'],
  },
];
