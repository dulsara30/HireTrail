import { ApplicationDoc } from '../models/application.model';
import { DuplicateWarningDto } from '@hiretrail/shared';

export class DuplicateDetector {
  public static findDuplicates(
    existingApps: ApplicationDoc[],
    companyName: string,
    roleTitle: string,
  ): DuplicateWarningDto[] {
    const normCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normRole = roleTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const duplicates: DuplicateWarningDto[] = [];

    for (const app of existingApps) {
      if (app.createdAt < ninetyDaysAgo) continue;

      const cNorm = app.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rNorm = app.roleTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (cNorm === normCompany && rNorm === normRole) {
        duplicates.push({
          id: app._id.toString(),
          roleTitle: app.roleTitle,
          companyName: app.companyName,
          appliedAt: app.dates?.appliedAt ? app.dates.appliedAt.toISOString() : null,
          statusLabel: undefined,
        });
      }
    }

    return duplicates;
  }
}
