import { Types } from 'mongoose';
import {
  type CompanyNoteDto,
  type CreateCompanyNoteInput,
  type UpdateCompanyNoteInput,
} from '@hiretrail/shared';
import { NotFoundError, ValidationError } from '../../../core/errors/domain-errors';
import { HtmlSanitizer } from '../../../core/security/html-sanitizer';
import { type CompanyRepository } from '../repositories/company.repository';
import { type CompanyNoteRepository } from '../repositories/company-note.repository';
import { type UserCompanyNotesRepository } from '../repositories/user-company-notes.repository';
import { CompanyNoteMapper } from '../mappers/company-note.mapper';

/** A user's own private notes about a company. Every query is scoped by userId. */
export class CompanyNoteService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly noteRepository: CompanyNoteRepository,
    private readonly userNotesRepository: UserCompanyNotesRepository,
  ) {}

  public async list(userId: string, companyId: string): Promise<CompanyNoteDto[]> {
    await this.requireVisibleCompany(userId, companyId);
    await this.migrateLegacyNote(userId, companyId);
    const notes = await this.noteRepository.listForCompany(userId, companyId);
    return notes.map(CompanyNoteMapper.toDto);
  }

  public async create(
    userId: string,
    companyId: string,
    input: CreateCompanyNoteInput,
  ): Promise<CompanyNoteDto> {
    await this.requireVisibleCompany(userId, companyId);
    const note = await this.noteRepository.createNote({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      bodyHtml: this.clean(input.bodyHtml),
      deletedAt: null,
    });
    return CompanyNoteMapper.toDto(note);
  }

  public async update(
    userId: string,
    noteId: string,
    input: UpdateCompanyNoteInput,
  ): Promise<CompanyNoteDto> {
    const updated = await this.noteRepository.updateOwnedWithVersion(
      userId,
      noteId,
      input.version,
      { $set: { bodyHtml: this.clean(input.bodyHtml), editedAt: new Date() } },
    );
    return CompanyNoteMapper.toDto(updated);
  }

  public async delete(userId: string, noteId: string): Promise<void> {
    const note = await this.noteRepository.findOwnedById(userId, noteId);
    if (!note || note.deletedAt) throw new NotFoundError();
    await this.noteRepository.softDeleteOwned(userId, noteId);
  }

  /** Turns the old single note into the first entry of the list, once. */
  private async migrateLegacyNote(userId: string, companyId: string): Promise<void> {
    const legacy = await this.userNotesRepository.takeLegacyNote(userId, companyId);
    if (!legacy) return;
    await this.noteRepository.createNote({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      bodyHtml: HtmlSanitizer.sanitize(legacy.html),
      createdAt: legacy.at,
      deletedAt: null,
    });
  }

  private clean(html: string): string {
    const clean = HtmlSanitizer.sanitize(html).trim();
    if (!clean) throw new ValidationError('A note cannot be empty');
    return clean;
  }

  private async requireVisibleCompany(userId: string, companyId: string): Promise<void> {
    const company = await this.companyRepository.findVisibleById(userId, companyId);
    if (!company) throw new NotFoundError(undefined, 'Company not found');
  }
}
