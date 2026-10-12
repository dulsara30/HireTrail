import { CompanyDoc } from '../models/company.model';
import { CompanyDto, CompanySummaryDto } from '@hiretrail/shared';

export class CompanyMapper {
  public static toSummaryDto(doc: CompanyDoc): CompanySummaryDto {
    return {
      id: doc._id.toString(),
      name: doc.name,
      domain: doc.website
        ? new URL(doc.website.startsWith('http') ? doc.website : `https://${doc.website}`).hostname
        : null,
      logoUrl: null,
      websiteUrl: doc.website || null,
      location: [doc.city, doc.country].filter(Boolean).join(', ') || null,
      isGlobal: doc.ownerId === null,
    };
  }

  public static toDto(doc: CompanyDoc): CompanyDto {
    const summary = this.toSummaryDto(doc);
    return {
      ...summary,
      ownerId: doc.ownerId ? doc.ownerId.toString() : null,
      tier: doc.tier ? (doc.tier as 'A' | 'B' | 'C' | 'UNRANKED') : 'UNRANKED',
      region: doc.region,
      source: {
        type: (doc.source?.type as 'ADMIN' | 'SEED' | 'USER_SUBMITTED') || 'USER_SUBMITTED',
      },
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
