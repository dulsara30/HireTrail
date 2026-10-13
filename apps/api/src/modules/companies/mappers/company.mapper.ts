import { CompanyDoc } from '../models/company.model';
import { UserCompanyNotesDoc } from '../models/user-company-notes.model';
import { CompanyDto, CompanySummaryDto, CompanyApplicationSummaryDto } from '@hiretrail/shared';

export class CompanyMapper {
  public static toSummaryDto(doc: CompanyDoc, hasApplications = false): CompanySummaryDto {
    let domain: string | null = null;
    if (doc.website) {
      try {
        domain = new URL(doc.website.startsWith('http') ? doc.website : `https://${doc.website}`)
          .hostname;
      } catch {
        domain = null;
      }
    }

    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      domain,
      logoUrl: null,
      websiteUrl: doc.website || null,
      location: [doc.city, doc.country].filter(Boolean).join(', ') || null,
      isGlobal: doc.ownerId === null,
      tier: (doc.tier as 'A' | 'B' | null) || null,
      region: doc.region,
      verification: doc.verification
        ? {
            status: doc.verification.status,
            score: doc.verification.score ?? null,
            checkedAt: doc.verification.checkedAt ? doc.verification.checkedAt.toISOString() : null,
          }
        : undefined,
      hasApplications,
    };
  }

  public static toDto(
    doc: CompanyDoc,
    notesDoc?: UserCompanyNotesDoc | null,
    myApplications: CompanyApplicationSummaryDto[] = [],
  ): CompanyDto {
    const summary = this.toSummaryDto(doc, myApplications.length > 0);
    return {
      ...summary,
      ownerId: doc.ownerId ? doc.ownerId.toString() : null,
      aliases: doc.aliases || [],
      country: doc.country,
      city: doc.city,
      careersUrl: doc.careersUrl,
      linkedinUrl: doc.linkedinUrl,
      contactEmail: doc.contactEmail,
      foundedYear: doc.foundedYear,
      size: doc.size,
      industry: doc.industry,
      techStack: doc.techStack || [],
      description: doc.description,
      hiringModel: doc.hiringModel,
      reportRatings: doc.reportRatings,
      myNotes: notesDoc
        ? {
            myRating: notesDoc.myRating,
            updatedAt: notesDoc.updatedAt.toISOString(),
          }
        : null,
      myApplications,
      source: {
        type: doc.source?.type || 'USER',
        ref: doc.source?.ref,
        importedAt: doc.source?.importedAt ? doc.source.importedAt.toISOString() : undefined,
      },
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
