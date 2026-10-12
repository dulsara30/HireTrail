import { type OptionColor } from '@hiretrail/shared';

export interface TagStyle {
  bg: string;
  text: string;
  border: string;
}

export const OPTION_COLOR_STYLES: Record<OptionColor, TagStyle> = {
  neutral: {
    bg: 'bg-bg-muted',
    text: 'text-text-secondary',
    border: 'border-border-default',
  },
  accent: {
    bg: 'bg-bg-accent-subtle',
    text: 'text-text-accent',
    border: 'border-border-accent',
  },
  info: {
    bg: 'bg-tag-info-bg',
    text: 'text-tag-info-text',
    border: 'border-tag-info-border',
  },
  purple: {
    bg: 'bg-tag-purple-bg',
    text: 'text-tag-purple-text',
    border: 'border-tag-purple-border',
  },
  success: {
    bg: 'bg-bg-success-subtle',
    text: 'text-text-success',
    border: 'border-tag-success-border',
  },
  danger: {
    bg: 'bg-bg-danger-subtle',
    text: 'text-text-danger',
    border: 'border-border-danger',
  },
  orange: {
    bg: 'bg-tag-orange-bg',
    text: 'text-tag-orange-text',
    border: 'border-tag-orange-border',
  },
  teal: {
    bg: 'bg-tag-teal-bg',
    text: 'text-tag-teal-text',
    border: 'border-tag-teal-border',
  },
  pink: {
    bg: 'bg-tag-pink-bg',
    text: 'text-tag-pink-text',
    border: 'border-tag-pink-border',
  },
  lime: {
    bg: 'bg-tag-lime-bg',
    text: 'text-tag-lime-text',
    border: 'border-tag-lime-border',
  },
  sky: {
    bg: 'bg-tag-sky-bg',
    text: 'text-tag-sky-text',
    border: 'border-tag-sky-border',
  },
  indigo: {
    bg: 'bg-tag-indigo-bg',
    text: 'text-tag-indigo-text',
    border: 'border-tag-indigo-border',
  },
};
