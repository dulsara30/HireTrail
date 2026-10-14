import {
  ORBIT_LIMITS,
  ORBIT_WIDGET_META,
  isOrbitReminderKind,
  type OrbitKind,
  type OrbitPlanLimits,
  type OrbitWidgetType,
} from '@hiretrail/shared';
import { AuthorizationError } from '../../../core/errors/domain-errors';
import { ErrorCode } from '@hiretrail/shared';

export type OrbitPlan = 'FREE' | 'PRO';

export const limitsFor = (plan: OrbitPlan): OrbitPlanLimits => ORBIT_LIMITS[plan];

export function proRequired(feature: string): AuthorizationError {
  return new AuthorizationError(`${feature} is a PRO feature`, ErrorCode.PLAN_REQUIRED);
}

export function limitReached(plan: OrbitPlan, bucket: string, limit: number): AuthorizationError {
  return new AuthorizationError(
    `Your ${plan === 'FREE' ? 'Free' : 'Pro'} plan allows ${limit} ${bucket}. Upgrade to PRO for more.`,
    ErrorCode.PLAN_LIMIT_REACHED,
    { limit, plan, bucket },
  );
}

/** Which count an item belongs to. */
export const bucketOf = (kind: OrbitKind): 'tasks' | 'reminders' =>
  isOrbitReminderKind(kind) ? 'reminders' : 'tasks';

/** Throws when the fields of an item need a feature the plan does not include. */
export function assertTaskFeatures(
  plan: OrbitPlan,
  item: {
    kind?: OrbitKind;
    tags?: string[];
    checklist?: unknown[];
    recurrence?: unknown;
  },
): void {
  const limits = limitsFor(plan);
  if (item.kind === 'WATCH' && !limits.watch) throw proRequired('Company watch');
  if (item.recurrence && !limits.recurrence) throw proRequired('Repeating items');
  if (item.checklist && item.checklist.length > 0) {
    if (limits.checklistSteps === 0) throw proRequired('Checklists');
    if (item.checklist.length > limits.checklistSteps) {
      throw limitReached(plan, 'checklist steps per item', limits.checklistSteps);
    }
  }
  if (item.tags && item.tags.length > limits.tagsPerItem) {
    throw limitReached(plan, 'tags per item', limits.tagsPerItem);
  }
}

/** Widget types that are Pro only. */
export const isProWidget = (type: OrbitWidgetType): boolean => ORBIT_WIDGET_META[type].pro;
