import { type Plan, type Role } from '@hiretrail/shared';

declare global {
  namespace Express {
    interface RequestUser {
      id: string;
      email: string;
      role: Role;
      plan: Plan;
      emailVerified: boolean;
    }

    interface Request {
      requestId: string;
      user?: RequestUser;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
