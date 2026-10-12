import { UserDoc } from '../models/user.model';
import { UserDto, MeDto, Role, Plan, AccountStatus } from '@hiretrail/shared';

export class UserMapper {
  static toDto(user: UserDoc): UserDto {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role as Role,
      plan: user.plan as Plan,
      status: user.status as AccountStatus,
      emailVerified: Boolean(user.emailVerifiedAt),
      preferences: {
        timezone: user.preferences?.timezone ?? 'Asia/Colombo',
        currency: user.preferences?.currency ?? 'LKR',
        collapsedLanes: user.preferences?.collapsedLanes ?? [],
        panelWidth: user.preferences?.panelWidth,
      },
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }

  static toMeDto(user: UserDoc, aiQuotas: MeDto['aiQuotaRemainingToday']): MeDto {
    return {
      ...this.toDto(user),
      aiQuotaRemainingToday: aiQuotas,
    };
  }
}
