import React from 'react';
import { ORBIT_KIND_META, type OrbitKind } from '@hiretrail/shared';
import { ORBIT_KIND_ICONS, orbitKindStyle } from '../../../constants/orbit-ui';
import { cn } from '../../../utils/helpers/class-names';

interface KindBadgeProps {
  kind: OrbitKind;
  /** Hide the label and show only the icon (still readable to screen readers). */
  iconOnly?: boolean;
  className?: string;
}

/** A coloured tag for an item kind. Every kind has its own colour on the whole Orbit page. */
export const KindBadge: React.FC<KindBadgeProps> = ({ kind, iconOnly = false, className }) => {
  const style = orbitKindStyle(kind);
  const Icon = ORBIT_KIND_ICONS[kind];
  const label = ORBIT_KIND_META[kind].label;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold',
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span className={iconOnly ? 'sr-only' : ''}>{label}</span>
    </span>
  );
};
