import {
  type AdminEmailPreviewDto,
  type AdminEmailPreviewInput,
  type AdminEmailResultDto,
  type AdminSendEmailInput,
} from '@hiretrail/shared';
import { type Mailer } from '../../../core/ports/mailer.port';
import { logger } from '../../../core/logger/logger';
import { type UserRepository } from '../../auth/repositories/user.repository';
import { type OrbitNotificationService } from '../../orbit/services/orbit-notification.service';
import { type EmailItem } from '../../orbit/services/orbit-email';
import { type AuditLogRepository } from '../repositories/audit-log.repository';
import { type AdminActor } from './admin-user.service';
import { buildAdminEmail } from './admin-email-templates';

type Result = AdminEmailResultDto['results'][number];

const SAMPLE_ITEMS: EmailItem[] = [
  { title: 'Send thank-you note', kind: 'TASK', when: 'Mon 12 Oct, 09:00', overdue: true },
  { title: 'Follow up with Sysco LABS', kind: 'FOLLOW_UP', when: 'Tue 13 Oct, 10:00' },
];

const pause = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * Lets an admin send one of the email templates to chosen users, and preview it first.
 * Only active accounts with a verified email are mailed. Each send is audited (no email body is stored).
 */
export class AdminEmailService {
  constructor(
    private readonly users: UserRepository,
    private readonly mailer: Mailer,
    private readonly notifications: OrbitNotificationService,
    private readonly auditRepo: AuditLogRepository,
    private readonly webAppUrl: string,
    /** The mail provider allows only a couple of requests per second, so sends are spaced out. */
    private readonly pauseMs = 600,
  ) {}

  public preview(input: AdminEmailPreviewInput): AdminEmailPreviewDto {
    const email = buildAdminEmail(input, 'Alex Perera', this.webAppUrl, SAMPLE_ITEMS);
    return { subject: email.subject, html: email.html };
  }

  public async send(actor: AdminActor, input: AdminSendEmailInput): Promise<AdminEmailResultDto> {
    const results: Result[] = [];
    const ids = [...new Set(input.userIds)];

    for (const [index, userId] of ids.entries()) {
      const result = await this.sendOne(userId, input);
      results.push(result);
      if (result.outcome !== 'SKIPPED' && index < ids.length - 1) await pause(this.pauseMs);
    }

    const sent = results.filter((r) => r.outcome === 'SENT').length;
    await this.auditRepo.append({
      actorId: actor.id,
      action: 'ADMIN_EMAIL_SENT',
      targetType: 'Email',
      targetId: null,
      after: {
        template: input.template,
        subject: input.subject,
        recipients: ids.length,
        sent,
        failed: results.filter((r) => r.outcome === 'FAILED').length,
      },
      ipHash: actor.ipHash,
    });
    return { sent, results };
  }

  private async sendOne(userId: string, input: AdminSendEmailInput): Promise<Result> {
    const skipped = (email: string | null, reason: string): Result => ({
      userId,
      email,
      outcome: 'SKIPPED',
      reason,
    });

    const user = await this.users.findById(userId);
    if (!user) return skipped(null, 'User not found');
    if (user.status !== 'ACTIVE') return skipped(user.email, 'Account is suspended');
    if (!user.emailVerifiedAt) return skipped(user.email, 'Email address is not verified');

    let dueItems: EmailItem[] = [];
    if (input.template === 'DUE_TASKS') {
      dueItems = await this.notifications.dueItemsFor(userId);
      if (dueItems.length === 0) return skipped(user.email, 'Nothing is due');
    }

    try {
      const email = buildAdminEmail(input, user.name, this.webAppUrl, dueItems);
      await this.mailer.send({ to: user.email, ...email });
      return { userId, email: user.email, outcome: 'SENT', reason: null };
    } catch (err) {
      logger.error({ err, userId }, 'Admin email could not be sent');
      return {
        userId,
        email: user.email,
        outcome: 'FAILED',
        reason: 'The mail provider did not accept the message',
      };
    }
  }
}
