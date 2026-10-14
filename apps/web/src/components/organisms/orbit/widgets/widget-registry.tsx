import React from 'react';
import {
  Activity,
  CalendarDays,
  Columns3,
  Eye,
  Flag,
  Hourglass,
  ListChecks,
  Orbit,
  StickyNote,
  Sun,
  Bell,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { type OrbitWidgetType } from '@hiretrail/shared';
import { AgingWidget } from './AgingWidget';
import { CalendarWidget } from './CalendarWidget';
import { DeadlinesWidget } from './DeadlinesWidget';
import { GoalWidget } from './GoalWidget';
import { NotesWidget } from './NotesWidget';
import { OrbitRadarWidget } from './OrbitRadarWidget';
import { PipelineWidget } from './PipelineWidget';
import { PulseWidget } from './PulseWidget';
import { RemindersWidget } from './RemindersWidget';
import { TasksWidget } from './TasksWidget';
import { TodayWidget } from './TodayWidget';
import { WatchWidget } from './WatchWidget';
import { type WidgetProps } from './widget-types';

export const WIDGET_COMPONENTS: Record<OrbitWidgetType, React.FC<WidgetProps>> = {
  ORBIT: OrbitRadarWidget,
  TODAY: TodayWidget,
  TASKS: TasksWidget,
  REMINDERS: RemindersWidget,
  PULSE: PulseWidget,
  DEADLINES: DeadlinesWidget,
  PIPELINE: PipelineWidget,
  AGING: AgingWidget,
  GOAL: GoalWidget,
  NOTES: NotesWidget,
  CALENDAR: CalendarWidget,
  WATCH: WatchWidget,
};

export const WIDGET_ICONS: Record<OrbitWidgetType, LucideIcon> = {
  ORBIT: Orbit,
  TODAY: Sun,
  TASKS: ListChecks,
  REMINDERS: Bell,
  PULSE: Activity,
  DEADLINES: Flag,
  PIPELINE: Columns3,
  AGING: Hourglass,
  GOAL: Target,
  NOTES: StickyNote,
  CALENDAR: CalendarDays,
  WATCH: Eye,
};
