import { type OrbitSettingsDto, type OrbitSpaceDto, type OrbitTaskDto } from '@hiretrail/shared';
import { type OrbitSettingsDoc } from '../models/orbit-settings.model';
import { type OrbitSpaceDoc } from '../models/orbit-space.model';
import { type OrbitTaskDoc } from '../models/orbit-task.model';

export interface TaskLinks {
  applicationLabels: Map<string, string>;
  companyNames: Map<string, string>;
}

const iso = (date: Date | null | undefined): string | null => (date ? date.toISOString() : null);

export class OrbitMapper {
  public static toTaskDto(doc: OrbitTaskDoc, links?: TaskLinks): OrbitTaskDto {
    const applicationId = doc.applicationId ? doc.applicationId.toString() : null;
    const companyId = doc.companyId ? doc.companyId.toString() : null;
    return {
      id: doc._id.toString(),
      title: doc.title,
      notesHtml: doc.notesHtml ?? null,
      kind: doc.kind,
      status: doc.status,
      priority: doc.priority,
      dueAt: iso(doc.dueAt),
      allDay: doc.allDay,
      remindAt: iso(doc.remindAt),
      applicationId,
      applicationLabel: applicationId
        ? (links?.applicationLabels.get(applicationId) ?? null)
        : null,
      companyId,
      companyName: companyId ? (links?.companyNames.get(companyId) ?? null) : null,
      tags: doc.tags ?? [],
      checklist: (doc.checklist ?? []).map((c) => ({ id: c.id, text: c.text, done: c.done })),
      recurrence: doc.recurrence
        ? { freq: doc.recurrence.freq, interval: doc.recurrence.interval }
        : null,
      watchUrl: doc.watchUrl ?? null,
      completedAt: iso(doc.completedAt),
      snoozedUntil: iso(doc.snoozedUntil),
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  public static toSpaceDto(doc: OrbitSpaceDoc): OrbitSpaceDto {
    return {
      id: doc._id.toString(),
      name: doc.name,
      order: doc.order,
      widgets: doc.widgets.map((w) => ({
        id: w.id,
        type: w.type,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        config: (w.config ?? {}) as Record<string, unknown>,
      })),
      version: doc.version,
    };
  }

  public static toSettingsDto(doc: OrbitSettingsDoc): OrbitSettingsDto {
    return {
      timezone: doc.timezone,
      emailDigest: doc.emailDigest,
      emailReminders: doc.emailReminders,
      digestHour: doc.digestHour,
      weeklyGoal: doc.weeklyGoal,
    };
  }
}
