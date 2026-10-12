import { httpClient } from '../client/http-client';
import { DATA_ENDPOINTS } from '../endpoints/admin.endpoints';
import {
  type ApiSuccess,
  type ImportCommitInput,
  type ImportPreviewDto,
  type ImportResultDto,
  type InsightsDto,
} from '@hiretrail/shared';

export const dataTransferService = {
  async exportApplicationsCsv(): Promise<Blob> {
    const res = await httpClient.get<Blob>(DATA_ENDPOINTS.exportApplications, {
      responseType: 'blob',
      timeout: 120000,
    });
    return res.data;
  },

  async exportAccountZip(): Promise<Blob> {
    const res = await httpClient.get<Blob>(DATA_ENDPOINTS.exportAccount, {
      responseType: 'blob',
      timeout: 120000,
    });
    return res.data;
  },

  async previewImport(fileName: string, csvText: string): Promise<ImportPreviewDto> {
    const res = await httpClient.post<ApiSuccess<ImportPreviewDto>>(
      DATA_ENDPOINTS.importPreview,
      csvText,
      { params: { fileName }, headers: { 'Content-Type': 'text/csv' }, timeout: 60000 },
    );
    return res.data.data;
  },

  async commitImport(input: ImportCommitInput): Promise<ImportResultDto> {
    const res = await httpClient.post<ApiSuccess<ImportResultDto>>(
      DATA_ENDPOINTS.importCommit,
      input,
      { timeout: 300000 },
    );
    return res.data.data;
  },

  async getInsights(): Promise<InsightsDto | null> {
    const res = await httpClient.get<ApiSuccess<InsightsDto | null>>(DATA_ENDPOINTS.insights);
    return res.data.data;
  },

  async refreshInsights(): Promise<InsightsDto> {
    const res = await httpClient.post<ApiSuccess<InsightsDto>>(
      DATA_ENDPOINTS.refreshInsights,
      {},
      { timeout: 60000 },
    );
    return res.data.data;
  },
};
