import { httpClient } from '../client/http-client';
import { COMPANY_ENDPOINTS } from '../endpoints/companies.endpoints';
import { CompanyDto, CompanySummaryDto, CreateCompanyInput, ApiSuccess } from '@hiretrail/shared';

export const companiesService = {
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

  async getById(id: string): Promise<CompanyDto> {
    const res = await httpClient.get<ApiSuccess<CompanyDto>>(COMPANY_ENDPOINTS.byId(id));
    return res.data.data;
  },
};
