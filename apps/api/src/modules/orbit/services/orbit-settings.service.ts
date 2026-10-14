import { type OrbitSettingsDto, type UpdateOrbitSettingsInput } from '@hiretrail/shared';
import { ValidationError } from '../../../core/errors/domain-errors';
import { OrbitMapper } from '../mappers/orbit.mapper';
import { type OrbitSettingsDoc } from '../models/orbit-settings.model';
import { type OrbitSettingsRepository } from '../repositories/orbit-settings.repository';
import { limitsFor, proRequired } from './orbit-plan';
import { type OrbitActor } from './orbit-task-command.service';
import { isValidTimeZone } from './orbit-time';

export class OrbitSettingsService {
  constructor(private readonly settings: OrbitSettingsRepository) {}

  public async get(userId: string): Promise<OrbitSettingsDto> {
    return OrbitMapper.toSettingsDto(await this.settings.getOrCreate(userId));
  }

  public async update(
    actor: OrbitActor,
    input: UpdateOrbitSettingsInput,
  ): Promise<OrbitSettingsDto> {
    const changes: Partial<OrbitSettingsDoc> = {};
    if (input.timezone !== undefined) {
      if (!isValidTimeZone(input.timezone)) throw new ValidationError('Unknown time zone');
      changes.timezone = input.timezone;
    }
    if (input.emailDigest !== undefined) {
      if (input.emailDigest && !limitsFor(actor.plan).email) throw proRequired('Email digest');
      changes.emailDigest = input.emailDigest;
    }
    if (input.emailReminders !== undefined) {
      if (input.emailReminders && !limitsFor(actor.plan).email)
        throw proRequired('Email reminders');
      changes.emailReminders = input.emailReminders;
    }
    if (input.digestHour !== undefined) changes.digestHour = input.digestHour;
    if (input.weeklyGoal !== undefined) changes.weeklyGoal = input.weeklyGoal;
    return OrbitMapper.toSettingsDto(await this.settings.update(actor.id, changes));
  }
}
