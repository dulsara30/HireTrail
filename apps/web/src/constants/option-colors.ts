import { type OptionColor } from '@hiretrail/shared';

export interface TagStyle {
  bg: string;
  text: string;
  border: string;
  /** Solid colour for pickers and dots. */
  swatch: string;
}

export const OPTION_COLOR_STYLES: Record<OptionColor, TagStyle> = {
  neutral: {
    bg: 'bg-bg-muted',
    text: 'text-text-secondary',
    border: 'border-border-default',
    swatch: 'bg-text-tertiary',
  },
  accent: {
    bg: 'bg-bg-accent-subtle',
    text: 'text-text-accent',
    border: 'border-border-accent',
    swatch: 'bg-bg-accent',
  },
  info: {
    bg: 'bg-tag-info-bg',
    text: 'text-tag-info-text',
    border: 'border-tag-info-border',
    swatch: 'bg-tag-info-text',
  },
  purple: {
    bg: 'bg-tag-purple-bg',
    text: 'text-tag-purple-text',
    border: 'border-tag-purple-border',
    swatch: 'bg-tag-purple-text',
  },
  success: {
    bg: 'bg-bg-success-subtle',
    text: 'text-text-success',
    border: 'border-tag-success-border',
    swatch: 'bg-text-success',
  },
  danger: {
    bg: 'bg-bg-danger-subtle',
    text: 'text-text-danger',
    border: 'border-border-danger',
    swatch: 'bg-bg-danger',
  },
  orange: {
    bg: 'bg-tag-orange-bg',
    text: 'text-tag-orange-text',
    border: 'border-tag-orange-border',
    swatch: 'bg-tag-orange-text',
  },
  teal: {
    bg: 'bg-tag-teal-bg',
    text: 'text-tag-teal-text',
    border: 'border-tag-teal-border',
    swatch: 'bg-tag-teal-text',
  },
  pink: {
    bg: 'bg-tag-pink-bg',
    text: 'text-tag-pink-text',
    border: 'border-tag-pink-border',
    swatch: 'bg-tag-pink-text',
  },
  lime: {
    bg: 'bg-tag-lime-bg',
    text: 'text-tag-lime-text',
    border: 'border-tag-lime-border',
    swatch: 'bg-tag-lime-text',
  },
  brown: {
    bg: 'bg-tag-brown-bg',
    text: 'text-tag-brown-text',
    border: 'border-tag-brown-border',
    swatch: 'bg-tag-brown-text',
  },
  indigo: {
    bg: 'bg-tag-indigo-bg',
    text: 'text-tag-indigo-text',
    border: 'border-tag-indigo-border',
    swatch: 'bg-tag-indigo-text',
  },
};
