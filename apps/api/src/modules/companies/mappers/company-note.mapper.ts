import { type CompanyNoteDto } from '@hiretrail/shared';
import { type CompanyNoteDoc } from '../models/company-note.model';

export class CompanyNoteMapper {
  public static toDto(doc: CompanyNoteDoc): CompanyNoteDto {
    return {
      id: doc._id.toString(),
      bodyHtml: doc.bodyHtml,
      createdAt: doc.createdAt.toISOString(),
      editedAt: doc.editedAt ? doc.editedAt.toISOString() : null,
      version: doc.version,
    };
  }
}
