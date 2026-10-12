import { PassThrough, type Writable } from 'node:stream';
import { ZipArchive } from 'archiver';
import { Types } from 'mongoose';
import { withTransaction } from '../../../core/db/transaction';
import { InternalError } from '../../../core/errors/domain-errors';
import { logger } from '../../../core/logger/logger';
import { type UserDoc } from '../../auth/models/user.model';
import { type ApplicationExportService } from '../../applications/services/application-export.service';
import { ACCOUNT_COLLECTIONS, findUncoveredModels } from './account-data.registry';

/** Permanent account deletion and the "download my data" ZIP, both driven by the collection registry. */
export class AccountService {
  constructor(private readonly exportService: ApplicationExportService) {}

  /** Deletes the user and everything they own in ONE transaction. */
  public async deleteAccount(userId: string): Promise<Record<string, number>> {
    const uncovered = findUncoveredModels();
    if (uncovered.length > 0) {
      // A collection with user data is missing from the registry: refuse instead of leaving data behind
      logger.error({ uncovered }, 'Account deletion blocked: collections missing from registry');
      throw new InternalError('Account deletion is temporarily unavailable');
    }

    const id = new Types.ObjectId(userId);
    return withTransaction(async (session) => {
      const counts: Record<string, number> = {};
      for (const collection of ACCOUNT_COLLECTIONS) {
        const filter = await collection.filter(id);
        const res = await collection.model.deleteMany(filter, { session });
        counts[collection.name] = res.deletedCount;
      }
      return counts;
    });
  }

  /** Streams a ZIP: user.json, one JSON per collection and applications.csv. */
  public async writeExportZip(user: UserDoc, out: Writable): Promise<void> {
    const id = new Types.ObjectId(user.id as string);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.pipe(out);

    const failed = new Promise<never>((_, reject) => {
      archive.on('error', reject);
      archive.on('warning', reject);
    });

    const build = async (): Promise<void> => {
      archive.append(
        JSON.stringify(
          {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            status: user.status,
            preferences: user.preferences,
            emailVerified: Boolean(user.emailVerifiedAt),
            googleLinked: Boolean(user.google),
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt ?? null,
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        { name: 'user.json' },
      );

      for (const collection of ACCOUNT_COLLECTIONS.filter((c) => c.exportable)) {
        const rows = await collection.model
          .find(await collection.filter(id))
          .lean()
          .exec();
        archive.append(JSON.stringify(rows, null, 2), { name: `data/${collection.name}.json` });
      }

      const csv = new PassThrough();
      archive.append(csv, { name: 'applications.csv' });
      await this.exportService.writeCsv(user.id as string, {}, csv);
      csv.end();
      await archive.finalize();
    };

    await Promise.race([build(), failed]);
  }
}
