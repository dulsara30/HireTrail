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
      sessionId?: string;
      user?: import('../modules/auth/models/user.model').UserDoc;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
