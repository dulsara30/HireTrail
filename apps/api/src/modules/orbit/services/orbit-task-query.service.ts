import { Types, trusted } from 'mongoose';
import {
  ORBIT_APPLICATION_EVENT_FIELDS,
  ORBIT_APPLICATION_EVENT_KIND,
  type ListOrbitTasksQuery,
  type OrbitApplicationEventDto,
  type OrbitDueDto,
  type OrbitPlanDto,
  type OrbitPulseDto,
  type OrbitTaskDto,
  type OrbitTimelineDto,
  type PageInfo,
} from '@hiretrail/shared';
import { NotFoundError, ValidationError } from '../../../core/errors/domain-errors';
import { ApplicationModel } from '../../applications/models/application.model';
import { OrbitMapper } from '../mappers/orbit.mapper';
import { type OrbitSettingsRepository } from '../repositories/orbit-settings.repository';
import { type OrbitTaskRepository } from '../repositories/orbit-task.repository';
import { type OrbitLinkResolver } from './orbit-link-resolver';
import { type OrbitActor } from './orbit-task-command.service';
import { limitsFor } from './orbit-plan';
import { dayKeyAtOffset, dayStartUtc, streakDays, weekStartUtc } from './orbit-time';

const DAY_MS = 24 * 60 * 60 * 1000;
const TIMELINE_CAP = 500;
const MAX_WINDOW_DAYS = 400;
const OPEN_APPLICATION_EXCLUDED = ['CLOSED', 'ACCEPTED'];

/** Reads for the Orbit page: lists, the timeline, what is due, weekly numbers and plan usage. */
export class OrbitTaskQueryService {
  constructor(
    private readonly tasks: OrbitTaskRepository,
    private readonly links: OrbitLinkResolver,
    private readonly settings: OrbitSettingsRepository,
  ) {}

  public async list(
    userId: string,
    query: ListOrbitTasksQuery,
  ): Promise<{ items: OrbitTaskDto[]; page: PageInfo }> {
    const result = await this.tasks.list(userId, query);
    const links = await this.links.resolve(userId, result.items);
    return {
      items: result.items.map((doc) => OrbitMapper.toTaskDto(doc, links)),
      page: { hasMore: result.hasMore, nextCursor: result.nextCursor, limit: query.limit ?? 25 },
    };
  }

  public async get(userId: string, id: string): Promise<OrbitTaskDto> {
    const doc = await this.tasks.findOwnedById(userId, id);
    if (!doc || doc.deletedAt) throw new NotFoundError(undefined, 'Item not found');
    return OrbitMapper.toTaskDto(doc, await this.links.resolve(userId, [doc]));
  }

  /** Items with a date in the window, plus deadlines, follow-ups and interviews from applications. */
  public async timeline(userId: string, from: Date, to: Date): Promise<OrbitTimelineDto> {
    if (to.getTime() < from.getTime()) throw new ValidationError('The end must be after the start');
    if (to.getTime() - from.getTime() > MAX_WINDOW_DAYS * DAY_MS) {
      throw new ValidationError(`Choose a window of at most ${MAX_WINDOW_DAYS} days`);
    }
    const docs = await this.tasks.inWindow(userId, from, to, TIMELINE_CAP + 1);
    const truncated = docs.length > TIMELINE_CAP;
    const page = truncated ? docs.slice(0, TIMELINE_CAP) : docs;
    const links = await this.links.resolve(userId, page);
    return {
      tasks: page.map((doc) => OrbitMapper.toTaskDto(doc, links)),
      applicationEvents: await this.applicationEvents(userId, from, to),
      truncated,
    };
  }

  /** Dates saved on open applications. They appear on Orbit by themselves and are edited on the application. */
  public async applicationEvents(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<OrbitApplicationEventDto[]> {
    const range = trusted({ $gte: from, $lte: to });
    const rows = await ApplicationModel.find({
      userId: new Types.ObjectId(userId),
      deletedAt: null,
      archivedAt: null,
      statusCategory: trusted({ $nin: OPEN_APPLICATION_EXCLUDED }),
      $or: ORBIT_APPLICATION_EVENT_FIELDS.map((field) => ({ [`dates.${field}`]: range })),
    })
      .select('roleTitle companyName dates')
      .limit(TIMELINE_CAP)
      .lean()
      .exec();

    const events: OrbitApplicationEventDto[] = [];
    for (const row of rows) {
      for (const field of ORBIT_APPLICATION_EVENT_FIELDS) {
        const at = row.dates?.[field];
        if (!at || at < from || at > to) continue;
        events.push({
          id: `app:${row._id.toString()}:${field}`,
          applicationId: row._id.toString(),
          field,
          kind: ORBIT_APPLICATION_EVENT_KIND[field],
          at: at.toISOString(),
          roleTitle: row.roleTitle,
          companyName: row.companyName,
        });
      }
    }
    return events.sort((a, b) => a.at.localeCompare(b.at));
  }

  public async due(userId: string, now = new Date()): Promise<OrbitDueDto> {
    const [docs, overdueCount] = await Promise.all([
      this.tasks.dueNow(userId, now, 20),
      this.tasks.countOverdue(userId, now),
    ]);
    const links = await this.links.resolve(userId, docs);
    return { due: docs.map((doc) => OrbitMapper.toTaskDto(doc, links)), overdueCount };
  }

  /** Numbers for the Pulse and Goal widgets. `tzOffset` is the browser's UTC offset in minutes (east is positive). */
  public async pulse(userId: string, tzOffset: number, now = new Date()): Promise<OrbitPulseDto> {
    const weekStart = weekStartUtc(now, tzOffset);
    const nextWeek = new Date(weekStart.getTime() + 7 * DAY_MS);
    const lastWeek = new Date(weekStart.getTime() - 7 * DAY_MS);
    const dayStart = dayStartUtc(now, tzOffset);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const since = new Date(dayStart.getTime() - 60 * DAY_MS);
    const owner = new Types.ObjectId(userId);

    const appliedIn = (from: Date, to: Date) =>
      ApplicationModel.countDocuments({
        userId: owner,
        deletedAt: null,
        $or: [
          { 'milestones.appliedAt': trusted({ $gte: from, $lt: to }) },
          { 'dates.appliedAt': trusted({ $gte: from, $lt: to }) },
        ],
      }).exec();

    const [
      appliedThisWeek,
      appliedLastWeek,
      doneDates,
      openTotal,
      overdue,
      dueToday,
      recentApplied,
      waiting,
      settings,
    ] = await Promise.all([
      appliedIn(weekStart, nextWeek),
      appliedIn(lastWeek, weekStart),
      this.tasks.completedBetween(userId, since, dayEnd),
      this.tasks.countOpenAll(userId),
      this.tasks.countOverdue(userId, now),
      this.tasks.countDueBetween(userId, dayStart, dayEnd),
      ApplicationModel.find({
        userId: owner,
        deletedAt: null,
        $or: [
          { 'milestones.appliedAt': trusted({ $gte: since }) },
          { 'dates.appliedAt': trusted({ $gte: since }) },
        ],
      })
        .select('milestones.appliedAt dates.appliedAt')
        .lean()
        .exec(),
      ApplicationModel.find({
        userId: owner,
        deletedAt: null,
        archivedAt: null,
        statusCategory: 'APPLIED',
        'milestones.appliedAt': trusted({ $ne: null }),
      })
        .sort({ 'milestones.appliedAt': 1 })
        .limit(1)
        .select('milestones.appliedAt')
        .lean()
        .exec(),
      this.settings.getOrCreate(userId),
    ]);

    const doneThisWeek = doneDates.filter((d) => d >= weekStart && d < nextWeek).length;

    const activeDays = new Set<string>();
    for (const d of doneDates) activeDays.add(dayKeyAtOffset(d, tzOffset));
    for (const row of recentApplied) {
      const at = row.milestones?.appliedAt ?? row.dates?.appliedAt;
      if (at) activeDays.add(dayKeyAtOffset(at, tzOffset));
    }

    const oldest = waiting[0]?.milestones?.appliedAt;
    return {
      appliedThisWeek,
      appliedLastWeek,
      doneThisWeek,
      openTotal,
      overdue,
      dueToday,
      streakDays: streakDays(activeDays, dayKeyAtOffset(now, tzOffset)),
      oldestWaitDays: oldest
        ? Math.max(0, Math.floor((now.getTime() - oldest.getTime()) / DAY_MS))
        : null,
      weeklyGoal: settings.weeklyGoal,
    };
  }

  public async plan(actor: OrbitActor): Promise<OrbitPlanDto> {
    const reminderKinds = ['REMINDER', 'WATCH'];
    const [openTasks, openReminders] = await Promise.all([
      this.tasks.countOpen(actor.id, { notIn: reminderKinds }),
      this.tasks.countOpen(actor.id, { in: reminderKinds }),
    ]);
    return { plan: actor.plan, openTasks, openReminders, limits: limitsFor(actor.plan) };
  }
}
