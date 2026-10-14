import { Types } from 'mongoose';
import {
  isOrbitReminderKind,
  type CreateOrbitTaskInput,
  type OrbitKind,
  type OrbitTaskDto,
  type UpdateOrbitTaskInput,
} from '@hiretrail/shared';
import { NotFoundError } from '../../../core/errors/domain-errors';
import { HtmlSanitizer } from '../../../core/security/html-sanitizer';
import { type ApplicationRepository } from '../../applications/repositories/application.repository';
import { type CompanyRepository } from '../../companies/repositories/company.repository';
import { NO_DATE_SORT, type OrbitTaskDoc } from '../models/orbit-task.model';
import { OrbitMapper } from '../mappers/orbit.mapper';
import { type OrbitTaskRepository } from '../repositories/orbit-task.repository';
import { type OrbitLinkResolver } from './orbit-link-resolver';
import {
  assertTaskFeatures,
  bucketOf,
  limitReached,
  limitsFor,
  type OrbitPlan,
} from './orbit-plan';
import { nextOccurrence } from './orbit-time';

export interface OrbitActor {
  id: string;
  plan: OrbitPlan;
}

const sortAtOf = (dueAt: Date | null): Date => dueAt ?? NO_DATE_SORT;

/** Creates, edits, completes, snoozes and deletes a user's own items. */
export class OrbitTaskCommandService {
  constructor(
    private readonly tasks: OrbitTaskRepository,
    private readonly applications: ApplicationRepository,
    private readonly companies: CompanyRepository,
    private readonly links: OrbitLinkResolver,
  ) {}

  public async create(actor: OrbitActor, input: CreateOrbitTaskInput): Promise<OrbitTaskDto> {
    const kind = input.kind ?? 'TASK';
    assertTaskFeatures(actor.plan, {
      kind,
      tags: input.tags,
      checklist: input.checklist,
      recurrence: input.recurrence,
    });
    await this.assertRoom(actor, kind);
    const { applicationId, companyId } = await this.resolveLinks(
      actor.id,
      input.applicationId ?? null,
      input.companyId ?? null,
    );

    const dueAt = input.dueAt ?? null;
    // A reminder with a date reminds at that date unless told otherwise
    const remindAt = input.remindAt ?? (isOrbitReminderKind(kind) ? dueAt : null);

    const doc = await this.tasks.createTask({
      userId: new Types.ObjectId(actor.id),
      title: input.title,
      notesHtml: input.notesHtml ? HtmlSanitizer.sanitize(input.notesHtml) : null,
      kind,
      priority: input.priority ?? 'MEDIUM',
      status: 'OPEN',
      dueAt,
      sortAt: sortAtOf(dueAt),
      allDay: input.allDay ?? false,
      remindAt,
      applicationId,
      companyId,
      tags: this.cleanTags(input.tags),
      checklist: (input.checklist ?? []).map((c) => ({
        id: c.id,
        text: c.text,
        done: Boolean(c.done),
      })),
      recurrence: input.recurrence
        ? { freq: input.recurrence.freq, interval: input.recurrence.interval ?? 1 }
        : null,
      watchUrl: input.watchUrl ?? null,
      deletedAt: null,
    });
    return this.toDto(actor.id, doc);
  }

  public async update(
    actor: OrbitActor,
    id: string,
    input: UpdateOrbitTaskInput,
  ): Promise<OrbitTaskDto> {
    const existing = await this.requireOwned(actor.id, id);
    assertTaskFeatures(actor.plan, {
      kind: input.kind,
      tags: input.tags,
      checklist: input.checklist,
      recurrence: input.recurrence,
    });

    const nextKind: OrbitKind = input.kind ?? existing.kind;
    if (
      input.kind &&
      bucketOf(input.kind) !== bucketOf(existing.kind) &&
      existing.status === 'OPEN'
    ) {
      await this.assertRoom(actor, nextKind);
    }

    const changes: Record<string, unknown> = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.notesHtml !== undefined) {
      changes.notesHtml = input.notesHtml ? HtmlSanitizer.sanitize(input.notesHtml) : null;
    }
    if (input.kind !== undefined) changes.kind = input.kind;
    if (input.priority !== undefined) changes.priority = input.priority;
    if (input.allDay !== undefined) changes.allDay = input.allDay;
    if (input.tags !== undefined) changes.tags = this.cleanTags(input.tags);
    if (input.checklist !== undefined) {
      changes.checklist = input.checklist.map((c) => ({
        id: c.id,
        text: c.text,
        done: Boolean(c.done),
      }));
    }
    if (input.recurrence !== undefined) {
      changes.recurrence = input.recurrence
        ? { freq: input.recurrence.freq, interval: input.recurrence.interval ?? 1 }
        : null;
    }
    if (input.watchUrl !== undefined) changes.watchUrl = input.watchUrl ?? null;

    if (input.applicationId !== undefined || input.companyId !== undefined) {
      const applicationId =
        input.applicationId !== undefined
          ? (input.applicationId ?? null)
          : (existing.applicationId?.toString() ?? null);
      // A new application brings its company; otherwise the company stays as it was
      let companyId: string | null;
      if (input.companyId !== undefined) companyId = input.companyId ?? null;
      else if (input.applicationId) companyId = null;
      else companyId = existing.companyId?.toString() ?? null;
      const links = await this.resolveLinks(actor.id, applicationId, companyId);
      changes.applicationId = links.applicationId;
      changes.companyId = links.companyId;
    }

    if (input.dueAt !== undefined) {
      const dueAt = input.dueAt ?? null;
      changes.dueAt = dueAt;
      changes.sortAt = sortAtOf(dueAt);
      changes.snoozedUntil = null;
      changes.notifiedAt = null;
      if (input.remindAt === undefined && isOrbitReminderKind(nextKind) && !existing.remindAt) {
        changes.remindAt = dueAt;
      }
    }
    if (input.remindAt !== undefined) {
      changes.remindAt = input.remindAt ?? null;
      changes.notifiedAt = null;
    }

    const updated = await this.tasks.updateOwnedWithVersion(actor.id, id, input.version, {
      $set: changes,
    });
    return this.toDto(actor.id, updated);
  }

  /** Marks an item done. A repeating item (Pro) also gets its next copy. */
  public async complete(
    actor: OrbitActor,
    id: string,
    version: number,
  ): Promise<{ task: OrbitTaskDto; next: OrbitTaskDto | null }> {
    const existing = await this.requireOwned(actor.id, id);
    if (existing.status === 'DONE')
      return { task: await this.toDto(actor.id, existing), next: null };

    const now = new Date();
    const updated = await this.tasks.updateOwnedWithVersion(actor.id, id, version, {
      $set: { status: 'DONE', completedAt: now },
    });

    let next: OrbitTaskDoc | null = null;
    if (existing.recurrence && existing.dueAt && limitsFor(actor.plan).recurrence) {
      const dueAt = nextOccurrence(existing.dueAt, existing.recurrence, now);
      const gap = existing.remindAt ? existing.remindAt.getTime() - existing.dueAt.getTime() : null;
      next = await this.tasks.createTask({
        userId: existing.userId,
        title: existing.title,
        notesHtml: existing.notesHtml,
        kind: existing.kind,
        priority: existing.priority,
        status: 'OPEN',
        dueAt,
        sortAt: dueAt,
        allDay: existing.allDay,
        remindAt: gap === null ? null : new Date(dueAt.getTime() + gap),
        applicationId: existing.applicationId,
        companyId: existing.companyId,
        tags: existing.tags,
        checklist: existing.checklist.map((c) => ({ id: c.id, text: c.text, done: false })),
        recurrence: existing.recurrence,
        watchUrl: existing.watchUrl,
        deletedAt: null,
      });
    }

    return {
      task: await this.toDto(actor.id, updated),
      next: next ? await this.toDto(actor.id, next) : null,
    };
  }

  public async reopen(actor: OrbitActor, id: string, version: number): Promise<OrbitTaskDto> {
    const existing = await this.requireOwned(actor.id, id);
    if (existing.status === 'OPEN') return this.toDto(actor.id, existing);
    await this.assertRoom(actor, existing.kind);
    const updated = await this.tasks.updateOwnedWithVersion(actor.id, id, version, {
      $set: { status: 'OPEN', completedAt: null },
    });
    return this.toDto(actor.id, updated);
  }

  /** Moves the item and its reminder to a later time. */
  public async snooze(
    actor: OrbitActor,
    id: string,
    until: Date,
    version: number,
  ): Promise<OrbitTaskDto> {
    await this.requireOwned(actor.id, id);
    const updated = await this.tasks.updateOwnedWithVersion(actor.id, id, version, {
      $set: {
        dueAt: until,
        sortAt: until,
        remindAt: until,
        snoozedUntil: until,
        notifiedAt: null,
      },
    });
    return this.toDto(actor.id, updated);
  }

  public async delete(actor: OrbitActor, id: string): Promise<void> {
    await this.requireOwned(actor.id, id);
    await this.tasks.softDeleteOwned(actor.id, id);
  }

  private async requireOwned(userId: string, id: string): Promise<OrbitTaskDoc> {
    const doc = await this.tasks.findOwnedById(userId, id);
    if (!doc || doc.deletedAt) throw new NotFoundError(undefined, 'Item not found');
    return doc;
  }

  /** Free plans have a cap on open items. Items over the cap (after leaving Pro) are kept. */
  private async assertRoom(actor: OrbitActor, kind: OrbitKind): Promise<void> {
    const bucket = bucketOf(kind);
    const limit = limitsFor(actor.plan)[bucket];
    const reminderKinds = ['REMINDER', 'WATCH'];
    const open = await this.tasks.countOpen(
      actor.id,
      bucket === 'reminders' ? { in: reminderKinds } : { notIn: reminderKinds },
    );
    if (open >= limit) throw limitReached(actor.plan, `open ${bucket}`, limit);
  }

  /** Checks that linked applications and companies belong to the user. A company defaults to the application's. */
  private async resolveLinks(
    userId: string,
    applicationId: string | null,
    companyId: string | null,
  ): Promise<{ applicationId: Types.ObjectId | null; companyId: Types.ObjectId | null }> {
    let resolvedCompany: string | null = companyId;
    let resolvedApplication: Types.ObjectId | null = null;

    if (applicationId) {
      const app = await this.applications.findOwnedById(userId, applicationId);
      if (!app || app.deletedAt) throw new NotFoundError(undefined, 'Application not found');
      resolvedApplication = app._id;
      if (!resolvedCompany && app.companyId) resolvedCompany = app.companyId.toString();
    }
    if (resolvedCompany) {
      const company = await this.companies.findVisibleById(userId, resolvedCompany);
      if (!company) throw new NotFoundError(undefined, 'Company not found');
      return { applicationId: resolvedApplication, companyId: company._id };
    }
    return { applicationId: resolvedApplication, companyId: null };
  }

  private cleanTags(tags: string[] | undefined): string[] {
    return Array.from(new Set((tags ?? []).map((t) => t.trim()).filter(Boolean)));
  }

  private async toDto(userId: string, doc: OrbitTaskDoc): Promise<OrbitTaskDto> {
    return OrbitMapper.toTaskDto(doc, await this.links.resolve(userId, [doc]));
  }
}
