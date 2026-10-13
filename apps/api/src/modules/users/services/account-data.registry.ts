import mongoose, { Types, trusted, type FilterQuery, type Model } from 'mongoose';
import { ActivityModel } from '../../activities/models/activity.model';
import { AiUsageModel } from '../../ai/models/ai-usage.model';
import { ApplicationModel } from '../../applications/models/application.model';
import { ImportModel } from '../../applications/models/import.model';
import { OneTimeTokenModel } from '../../auth/models/one-time-token.model';
import { SessionModel } from '../../auth/models/session.model';
import { UserModel } from '../../auth/models/user.model';
import { CommentModel } from '../../comments/models/comment.model';
import { CompanyModel } from '../../companies/models/company.model';
import { CompanyVerificationModel } from '../../companies/models/company-verification.model';
import { CompanyNoteModel } from '../../companies/models/company-note.model';
import { UserCompanyNotesModel } from '../../companies/models/user-company-notes.model';
import { AiInsightsModel } from '../../dashboard/models/ai-insights.model';
import { OptionModel } from '../../options/models/option.model';
import { AuditLogModel } from '../../admin/models/audit-log.model';
import { AiLookupCacheModel } from '../../companies/models/ai-lookup-cache.model';

export interface AccountCollection {
  /** File name in the data export and label in logs. */
  name: string;
  model: Model<never>;
  /** Selects this user's documents. May look up related ids first. */
  filter: (userId: Types.ObjectId) => Promise<FilterQuery<never>> | FilterQuery<never>;
  /** Included in the data export (security data such as sessions and tokens is not). */
  exportable: boolean;
}

const asModel = (m: unknown): Model<never> => m as Model<never>;

/**
 * Every collection that holds data about a user. Account deletion and data export both walk this
 * list. Order matters for deletion: dependents first, the user document last.
 */
export const ACCOUNT_COLLECTIONS: AccountCollection[] = [
  {
    name: 'company-verifications-of-private-companies',
    model: asModel(CompanyVerificationModel),
    // Verifications of the user's own private companies. Shared verifications of global companies stay.
    filter: async (userId) => {
      const ids = await CompanyModel.find({ ownerId: userId }).distinct('_id');
      return { companyId: trusted({ $in: ids }) } as FilterQuery<never>;
    },
    exportable: false,
  },
  {
    name: 'applications',
    model: asModel(ApplicationModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'comments',
    model: asModel(CommentModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'activities',
    model: asModel(ActivityModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'options',
    model: asModel(OptionModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'company-notes',
    model: asModel(UserCompanyNotesModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'company-note-entries',
    model: asModel(CompanyNoteModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'private-companies',
    model: asModel(CompanyModel),
    filter: (userId) => ({ ownerId: userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'ai-usage',
    model: asModel(AiUsageModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'ai-insights',
    model: asModel(AiInsightsModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: true,
  },
  {
    name: 'imports',
    model: asModel(ImportModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: false,
  },
  {
    name: 'sessions',
    model: asModel(SessionModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: false,
  },
  {
    name: 'one-time-tokens',
    model: asModel(OneTimeTokenModel),
    filter: (userId) => ({ userId }) as FilterQuery<never>,
    exportable: false,
  },
  {
    name: 'user',
    model: asModel(UserModel),
    filter: (userId) => ({ _id: userId }) as FilterQuery<never>,
    exportable: false,
  },
];

/**
 * Models that reference users but are deliberately kept, with the reason.
 * - AuditLog: append-only record of admin actions.
 * - AiLookupCache: shared cache, holds no user data.
 */
const EXEMPT: Record<string, string> = {
  [AuditLogModel.modelName]: 'append-only admin audit trail',
  [AiLookupCacheModel.modelName]: 'shared cache without user data',
};

const USER_PATHS = ['userId', 'ownerId', 'requestedBy', 'actorId'];

/**
 * Fails closed: returns the model names that have a user-reference field but are neither registered
 * nor exempt. Deletion refuses to run while this list is not empty, so a new collection can never
 * be silently forgotten.
 */
export function findUncoveredModels(): string[] {
  const covered = new Set<string>([
    ...ACCOUNT_COLLECTIONS.map((c) => c.model.modelName),
    ...Object.keys(EXEMPT),
  ]);
  return mongoose
    .modelNames()
    .filter((name) => {
      const schema = mongoose.model(name).schema;
      return USER_PATHS.some((p) => schema.path(p)) && !covered.has(name);
    })
    .sort();
}
