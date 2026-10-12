import { type Writable } from 'node:stream';
import { once } from 'node:events';
import { type ListApplicationsQuery } from '@hiretrail/shared';
import { CsvEscaper } from '../../../core/security/csv-escaper';
import { ApplicationModel } from '../models/application.model';
import { type OptionRepository } from '../../options/repositories/option.repository';
import { type ApplicationQueryService } from './application-query.service';
import { CSV_HEADERS, applicationToCsvValues } from './application-csv';

/** Streams the user's applications (same filters as the list) as formula-safe CSV. */
export class ApplicationExportService {
  constructor(
    private readonly queryService: ApplicationQueryService,
    private readonly optionRepo: OptionRepository,
  ) {}

  public async writeCsv(
    userId: string,
    query: Partial<ListApplicationsQuery>,
    out: Writable,
  ): Promise<number> {
    const options = await this.optionRepo.findAllForUser(userId, true);
    const labels = new Map(options.map((o) => [o._id.toString(), o.label]));
    const label = (id?: { toString(): string } | null): string =>
      id ? (labels.get(id.toString()) ?? '') : '';

    // The filter is always scoped by userId inside buildFilter
    const filter = this.queryService.buildFilter(userId, query);
    const write = async (line: string): Promise<void> => {
      if (!out.write(line)) await once(out, 'drain');
    };

    // UTF-8 BOM so spreadsheet apps read non-ASCII text correctly
    await write('﻿' + CsvEscaper.escapeRow([...CSV_HEADERS]) + '\r\n');
    let count = 0;
    const cursor = ApplicationModel.find(filter).sort({ _id: 1 }).cursor();
    for await (const app of cursor) {
      await write(CsvEscaper.escapeRow(applicationToCsvValues(app, label)) + '\r\n');
      count++;
    }
    return count;
  }
}
