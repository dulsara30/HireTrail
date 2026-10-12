import {
  IMPORT_MAX_ROWS,
  createApplicationSchema,
  type ImportCommitInput,
  type ImportPreviewDto,
  type ImportResultDto,
  type ImportField,
  type CreateApplicationInput,
  OptionType,
} from '@hiretrail/shared';
import { CsvParser } from '../../../core/csv/csv-parser';
import {
  LimitReachedError,
  NotFoundError,
  ValidationError,
} from '../../../core/errors/domain-errors';
import { type OptionRepository } from '../../options/repositories/option.repository';
import { type OptionCommandService } from '../../options/services/option-command.service';
import { type OptionDoc } from '../../options/models/option.model';
import { OptionMatcher } from '../../ai/services/option-matcher';
import { type ImportRepository } from '../repositories/import.repository';
import { type ApplicationCommandService } from './application-command.service';
import {
  ImportRowMapper,
  OPTION_FIELD_TYPE,
  suggestMapping,
  type ImportMapping,
  type MappedRow,
  type OptionImportField,
} from './import-row-mapper';

const SAMPLE_SIZE = 20;
const PLACEHOLDER_ID = '000000000000000000000000';

const escapeHtml = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textToHtml = (text: string): string =>
  text
    .split(/\n{2,}/)
    .filter((b) => b.trim())
    .map((b) => `<p>${escapeHtml(b.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');

export class ApplicationImportService {
  constructor(
    private readonly importRepo: ImportRepository,
    private readonly optionRepo: OptionRepository,
    private readonly optionCommand: OptionCommandService,
    private readonly commandService: ApplicationCommandService,
  ) {}

  /** Parses the CSV and stages the rows (1 h TTL). Nothing is imported yet. */
  public async preview(userId: string, fileName: string, csv: string): Promise<ImportPreviewDto> {
    const table = CsvParser.parse(csv);
    const headerRow = table[0];
    if (!headerRow || headerRow.length === 0)
      throw new ValidationError('The file has no header row');
    const headers = headerRow.map((h) => h.trim());
    if (new Set(headers).size !== headers.length || headers.some((h) => !h)) {
      throw new ValidationError('Column headers must be unique and not empty');
    }
    const dataRows = table.slice(1);
    if (dataRows.length === 0) throw new ValidationError('The file has no data rows');
    if (dataRows.length > IMPORT_MAX_ROWS) {
      throw new LimitReachedError(`A single import can have at most ${IMPORT_MAX_ROWS} rows`);
    }

    const rows = dataRows.map((cells) =>
      Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()])),
    );
    const staged = await this.importRepo.stage(userId, { fileName, headers, rows });
    const mapping = suggestMapping(headers);

    const options = await this.optionRepo.findAllForUser(userId, false);
    const sampleErrors: ImportPreviewDto['sampleErrors'] = [];
    rows.slice(0, SAMPLE_SIZE).forEach((row, index) => {
      const error = this.validateRow(row, mapping, undefined);
      if (error) sampleErrors.push({ row: index + 2, message: error });
    });

    return {
      importId: staged._id.toString(),
      fileName,
      headers,
      rowCount: rows.length,
      sampleRows: rows.slice(0, SAMPLE_SIZE),
      suggestedMapping: mapping,
      sampleErrors,
      unknownOptions: this.unknownOptions(rows, mapping, options),
      expiresAt: staged.expiresAt.toISOString(),
    };
  }

  public async commit(userId: string, input: ImportCommitInput): Promise<ImportResultDto> {
    const staged = await this.importRepo.findOwned(userId, input.importId);
    if (!staged || staged.status !== 'PREVIEWED' || staged.expiresAt.getTime() < Date.now()) {
      throw new NotFoundError(undefined, 'Import not found or expired. Upload the file again.');
    }

    const mapping = Object.fromEntries(
      Object.entries(input.mapping).filter(([, header]) => header),
    ) as ImportMapping;
    for (const header of Object.values(mapping)) {
      if (!staged.headers.includes(header)) throw new ValidationError(`Unknown column "${header}"`);
    }
    if (!mapping.company || !mapping.roleTitle) {
      throw new ValidationError('Map the Company and Role Title columns to continue');
    }
    if (!(await this.importRepo.markCommitted(userId, input.importId))) {
      throw new NotFoundError(undefined, 'This import was already committed');
    }

    let options = await this.optionRepo.findAllForUser(userId, false);
    let createdOptions = 0;
    const errors: ImportResultDto['errors'] = [];

    // Unknown option values are created on the fly (when allowed)
    if (input.createMissingOptions) {
      const unknown = this.unknownOptions(staged.rows, mapping, options);
      for (const [field, labels] of Object.entries(unknown) as Array<[ImportField, string[]]>) {
        const type = OPTION_FIELD_TYPE[field as OptionImportField] as OptionType;
        for (const label of labels) {
          try {
            await this.optionCommand.create(userId, {
              type,
              label: label.slice(0, 40),
              color: 'neutral',
              ...(type === OptionType.STATUS ? { meta: { category: 'SAVED' } } : {}),
            });
            createdOptions++;
          } catch {
            // limit or duplicate: rows using it fall back to "no value"
          }
        }
      }
      options = await this.optionRepo.findAllForUser(userId, false);
    }

    const defaultStatus = options.find((o) => o.type === 'STATUS');
    if (!defaultStatus) throw new ValidationError('Create at least one status before importing');

    let created = 0;
    for (const [index, row] of staged.rows.entries()) {
      const rowNumber = index + 2;
      try {
        const mapped = ImportRowMapper.map(row, mapping);
        const payload = this.toInput(mapped, options, defaultStatus);
        const valid = (await createApplicationSchema.validate(payload, {
          abortEarly: true,
          stripUnknown: true,
        })) as CreateApplicationInput;
        await this.commandService.create(userId, valid);
        created++;
      } catch (err) {
        errors.push({
          row: rowNumber,
          message: (err as Error).message || 'Row could not be imported',
        });
      }
    }

    return {
      created,
      skipped: staged.rows.length - created,
      createdOptions,
      errors: errors.slice(0, 100),
    };
  }

  /** Returns an error message for a row, or null when it looks importable. */
  private validateRow(
    row: Record<string, string>,
    mapping: ImportMapping,
    _options: OptionDoc[] | undefined,
  ): string | null {
    try {
      const mapped = ImportRowMapper.map(row, mapping);
      const payload = this.toInput(mapped, [], undefined);
      createApplicationSchema.validateSync(payload, { abortEarly: true });
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  }

  private toInput(
    mapped: MappedRow,
    options: OptionDoc[],
    defaultStatus: OptionDoc | undefined,
  ): Record<string, unknown> {
    const pick = (field: OptionImportField): string | null => {
      const label = mapped.options[field];
      if (!label) return null;
      const type = OPTION_FIELD_TYPE[field];
      return (
        OptionMatcher.match(
          options.filter((o) => o.type === type),
          label,
        )?._id.toString() ?? null
      );
    };

    return {
      roleTitle: mapped.roleTitle,
      companyName: mapped.company,
      statusId: pick('status') ?? defaultStatus?._id.toString() ?? PLACEHOLDER_ID,
      priorityId: pick('priority'),
      workModeId: pick('workMode'),
      jobTypeId: pick('jobType'),
      levelId: pick('level'),
      sourceId: pick('source'),
      cvVersionId: pick('cvVersion'),
      coverLetter: mapped.coverLetter,
      labelIds: [],
      location: mapped.location ?? null,
      jobUrl: mapped.jobUrl ?? null,
      jobDescriptionHtml: mapped.jobDescription ? textToHtml(mapped.jobDescription) : null,
      notesHtml: mapped.notes ? textToHtml(mapped.notes) : null,
      salary: mapped.salary ?? null,
      dates: Object.keys(mapped.dates).length > 0 ? mapped.dates : null,
      contacts: [],
    };
  }

  private unknownOptions(
    rows: Array<Record<string, string>>,
    mapping: ImportMapping,
    options: OptionDoc[],
  ): ImportPreviewDto['unknownOptions'] {
    const result: ImportPreviewDto['unknownOptions'] = {};
    for (const field of Object.keys(OPTION_FIELD_TYPE) as OptionImportField[]) {
      const header = mapping[field];
      if (!header) continue;
      const type = OPTION_FIELD_TYPE[field];
      const pool = options.filter((o) => o.type === type);
      const seen = new Map<string, string>();
      for (const row of rows) {
        const value = (row[header] ?? '').trim();
        if (value && !seen.has(value.toLowerCase()) && !OptionMatcher.match(pool, value)) {
          seen.set(value.toLowerCase(), value);
        }
      }
      if (seen.size > 0) result[field] = Array.from(seen.values()).slice(0, 30);
    }
    return result;
  }
}
