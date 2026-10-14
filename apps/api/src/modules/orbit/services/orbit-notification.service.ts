import { Types } from 'mongoose';
import { ORBIT_KIND_META, type OrbitKind } from '@hiretrail/shared';
import { type Mailer } from '../../../core/ports/mailer.port';
import { logger } from '../../../core/logger/logger';
import { type UserRepository } from '../../auth/repositories/user.repository';
import { type OrbitTaskDoc } from '../models/orbit-task.model';
import { type OrbitSettingsRepository } from '../repositories/orbit-settings.repository';
import { type OrbitTaskRepository } from '../repositories/orbit-task.repository';
import { type OrbitLinkResolver } from './orbit-link-resolver';
import { type OrbitTaskQueryService } from './orbit-task-query.service';
import { buildDigestEmail, buildReminderEmail, type EmailItem } from './orbit-email';
import { isValidTimeZone, localDateKey, localHour } from './orbit-time';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_ITEMS = 12;

interface Recipient {
  name: string;
  email: string;
}

/** Sends reminder and digest emails (Resend) to Pro users who turned them on. Called by the cron routes. */
export class OrbitNotificationService {
  constructor(
    private readonly tasks: OrbitTaskRepository,
    private readonly settings: OrbitSettingsRepository,
    private readonly users: UserRepository,
    private readonly links: OrbitLinkResolver,
    private readonly query: OrbitTaskQueryService,
    private readonly mailer: Mailer,
    private readonly webAppUrl: string,
  ) {}

  /** Emails items whose reminder time has passed. Each item is emailed once. */
  public async sendDueReminders(now = new Date()): Promise<{ emails: number; items: number }> {
    const backlog = await this.tasks.reminderBacklog(now, 48, 500);
    const byUser = new Map<string, OrbitTaskDoc[]>();
    for (const doc of backlog) {
      const key = doc.userId.toString();
      byUser.set(key, [...(byUser.get(key) ?? []), doc]);
    }

    let emails = 0;
    let items = 0;
    for (const [userId, docs] of byUser) {
      try {
        // Mark first: a reminder is worth sending at most once
        const claimed = await this.tasks.claimNotified(
          docs.map((d) => d._id as Types.ObjectId),
          now,
        );
        if (claimed === 0) continue;

        const settings = await this.settings.getOrCreate(userId);
        const recipient = await this.eligibleRecipient(userId, settings.emailReminders);
        if (!recipient) continue;

        const picked = docs.slice(0, MAX_ITEMS);
        const linkMap = await this.links.resolve(userId, picked);
        const list = picked.map((doc) => this.toEmailItem(doc, settings.timezone, now, linkMap));
        const email = buildReminderEmail(recipient.name, list, this.webAppUrl);
        await this.mailer.send({ to: recipient.email, ...email });
        emails++;
        items += picked.length;
      } catch (err) {
        logger.error({ err, userId }, 'Could not send Orbit reminder email');
      }
    }
    return { emails, items };
  }

  /** Emails the morning summary once per local day, at or after each user's chosen hour. */
  public async sendDigests(now = new Date()): Promise<{ emails: number }> {
    const candidates = await this.settings.digestCandidates(1000);
    let emails = 0;

    for (const settings of candidates) {
      const userId = settings.userId.toString();
      try {
        const timezone = isValidTimeZone(settings.timezone) ? settings.timezone : 'UTC';
        if (localHour(now, timezone) < settings.digestHour) continue;
        const today = localDateKey(now, timezone);
        if (settings.lastDigestDate === today) continue;

        const recipient = await this.eligibleRecipient(userId, true);
        if (!recipient) continue;
        // Claim the day first so two runs cannot send it twice
        if (!(await this.settings.claimDigestDate(userId, today))) continue;

        const until = new Date(now.getTime() + 3 * DAY_MS);
        const docs = await this.tasks.openUpTo(userId, until, MAX_ITEMS * 2);
        const events = await this.query.applicationEvents(
          userId,
          new Date(now.getTime() - HOUR_MS),
          until,
        );
        const linkMap = await this.links.resolve(userId, docs);

        const list: EmailItem[] = [
          ...docs.map((doc) => this.toEmailItem(doc, timezone, now, linkMap)),
          ...events.map((event) => ({
            title: `${event.roleTitle} at ${event.companyName}`,
            kind: event.kind,
            when: this.formatWhen(new Date(event.at), timezone, false),
            context: null,
            overdue: false,
          })),
        ].slice(0, MAX_ITEMS * 2);
        if (list.length === 0) continue;

        const email = buildDigestEmail(recipient.name, list, this.webAppUrl);
        await this.mailer.send({ to: recipient.email, ...email });
        emails++;
      } catch (err) {
        logger.error({ err, userId }, 'Could not send Orbit digest email');
      }
    }
    return { emails };
  }

  /** Only active Pro users with a verified email, and only when they asked for this email. */
  private async eligibleRecipient(userId: string, wanted: boolean): Promise<Recipient | null> {
    if (!wanted) return null;
    const user = await this.users.findById(userId);
    if (!user || user.status !== 'ACTIVE' || user.plan !== 'PRO' || !user.emailVerifiedAt)
      return null;
    return { name: user.name, email: user.email };
  }

  private toEmailItem(
    doc: OrbitTaskDoc,
    timezone: string,
    now: Date,
    links: Awaited<ReturnType<OrbitLinkResolver['resolve']>>,
  ): EmailItem {
    const tz = isValidTimeZone(timezone) ? timezone : 'UTC';
    const when = doc.dueAt ?? doc.remindAt;
    const appId = doc.applicationId?.toString();
    const companyId = doc.companyId?.toString();
    return {
      title: doc.title,
      kind: doc.kind as OrbitKind,
      when: when ? this.formatWhen(when, tz, doc.allDay) : ORBIT_KIND_META[doc.kind].label,
      context:
        (appId && links.applicationLabels.get(appId)) ||
        (companyId && links.companyNames.get(companyId)) ||
        null,
      overdue: Boolean(
        doc.dueAt && doc.dueAt.getTime() < now.getTime() - (doc.allDay ? DAY_MS : 0),
      ),
    };
  }

  private formatWhen(date: Date, timeZone: string, allDay: boolean): string {
    const tz = isValidTimeZone(timeZone) ? timeZone : 'UTC';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(allDay ? {} : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }),
    }).format(date);
  }
}
