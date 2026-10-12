import { httpClient } from '../client/http-client';
import { COMPANY_ENDPOINTS } from '../endpoints/companies.endpoints';
import {
  CompanyDto,
  CompanySummaryDto,
  CreateCompanyInput,
  UpdateCompanyInput,
  ListCompaniesQuery,
  UpsertCompanyNotesInput,
  UserCompanyNotesDto,
  ApiSuccess,
  CompanyVerificationDto,
  CompanyLookupDto,
  CompanyLookupRequestInput,
  VerifiableField,
} from '@hiretrail/shared';

export const companiesService = {
  async list(
    query?: ListCompaniesQuery,
  ): Promise<{ items: CompanySummaryDto[]; nextCursor: string | null; totalCount: number }> {
    const res = await httpClient.get<
      ApiSuccess<{ items: CompanySummaryDto[]; nextCursor: string | null; totalCount: number }>
    >(COMPANY_ENDPOINTS.list, {
      params: query,
    });
    return res.data.data;
  },

  async search(q?: string, limit?: number): Promise<CompanySummaryDto[]> {
    const res = await httpClient.get<ApiSuccess<CompanySummaryDto[]>>(COMPANY_ENDPOINTS.search, {
      params: { q, limit },
    });
    return res.data.data;
  },

  async create(input: CreateCompanyInput): Promise<CompanyDto> {
    const res = await httpClient.post<ApiSuccess<CompanyDto>>(COMPANY_ENDPOINTS.create, input);
    return res.data.data;
  },

  async getByIdOrSlug(idOrSlug: string): Promise<CompanyDto> {
    const res = await httpClient.get<ApiSuccess<CompanyDto>>(
      COMPANY_ENDPOINTS.byIdOrSlug(idOrSlug),
    );
    return res.data.data;
  },

  async update(id: string, input: UpdateCompanyInput): Promise<CompanyDto> {
    const res = await httpClient.patch<ApiSuccess<CompanyDto>>(COMPANY_ENDPOINTS.update(id), input);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(COMPANY_ENDPOINTS.delete(id));
  },

  async upsertNotes(id: string, input: UpsertCompanyNotesInput): Promise<UserCompanyNotesDto> {
    const res = await httpClient.put<ApiSuccess<UserCompanyNotesDto>>(
      COMPANY_ENDPOINTS.notes(id),
      input,
    );
    return res.data.data;
  },

  async verify(id: string, force = false): Promise<CompanyVerificationDto> {
    const res = await httpClient.post<ApiSuccess<CompanyVerificationDto>>(
      COMPANY_ENDPOINTS.verify(id),
      { force },
      { timeout: 90_000 },
    );
    return res.data.data;
  },

  async listVerifications(id: string): Promise<CompanyVerificationDto[]> {
    const res = await httpClient.get<ApiSuccess<CompanyVerificationDto[]>>(
      COMPANY_ENDPOINTS.verifications(id),
    );
    return res.data.data;
  },

  async applySuggestions(id: string, vid: string, fields: VerifiableField[]): Promise<CompanyDto> {
    const res = await httpClient.post<ApiSuccess<CompanyDto>>(
      COMPANY_ENDPOINTS.applySuggestions(id, vid),
      { fields },
    );
    return res.data.data;
  },

  async aiLookup(input: CompanyLookupRequestInput): Promise<CompanyLookupDto> {
    const res = await httpClient.post<ApiSuccess<CompanyLookupDto>>(
      COMPANY_ENDPOINTS.aiLookup,
      input,
      { timeout: 90_000 },
    );
    return res.data.data;
  },
};
