import {
  Bell,
  CalendarClock,
  CircleDot,
  Eye,
  Flag,
  Mic,
  Phone,
  Send,
  SquareCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ORBIT_KIND_META, type OrbitKind } from '@hiretrail/shared';
import { OPTION_COLOR_STYLES, type TagStyle } from './option-colors';

export const ORBIT_KIND_ICONS: Record<OrbitKind, LucideIcon> = {
  TASK: SquareCheck,
  REMINDER: Bell,
  CALL: Phone,
  MEETING: Users,
  INTERVIEW: Mic,
  FOLLOW_UP: Send,
  DEADLINE: Flag,
  WATCH: Eye,
  OTHER: CircleDot,
};

export const ORBIT_ICON_FALLBACK = CalendarClock;

/** Colour classes for one kind. The same colour is used on the radar, in lists and in the panel. */
export function orbitKindStyle(kind: OrbitKind): TagStyle {
  return OPTION_COLOR_STYLES[ORBIT_KIND_META[kind].color];
}
