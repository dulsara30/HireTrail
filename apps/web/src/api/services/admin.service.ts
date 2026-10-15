import { httpClient } from '../client/http-client';
import { ADMIN_ENDPOINTS } from '../endpoints/admin.endpoints';
import {
  type AdminAiUsageDto,
  type AiHealthDto,
  type AdminChangePlanInput,
  type AdminChangeStatusInput,
  type AdminCompanyDto,
  type AdminEmailPreviewDto,
  type AdminEmailPreviewInput,
  type AdminEmailResultDto,
  type AdminSendEmailInput,
  type AdminCompanyDetailDto,
  type AdminUpdateCompanyInput,
  type AdminCreateCompanyInput,
  type CompanyLookupDto,
  type CompanyLookupRequestInput,
  type AdminMergeCompanyInput,
  type AdminUserDetailDto,
  type AdminUserDto,
  type ApiSuccess,
  type AuditLogDto,
} from '@hiretrail/shared';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export const adminService = {
  async listUsers(params: {
    q?: string;
    plan?: string;
    role?: string;
    status?: string;
    cursor?: string;
  }): Promise<Page<AdminUserDto>> {
    const res = await httpClient.get<ApiSuccess<Page<AdminUserDto>>>(ADMIN_ENDPOINTS.users, {
      params: { ...params, limit: 20 },
    });
    return res.data.data;
  },

  async getUser(id: string): Promise<AdminUserDetailDto> {
    const res = await httpClient.get<ApiSuccess<AdminUserDetailDto>>(ADMIN_ENDPOINTS.user(id));
    return res.data.data;
  },

  async changePlan(id: string, input: AdminChangePlanInput): Promise<AdminUserDto> {
    const res = await httpClient.patch<ApiSuccess<AdminUserDto>>(
      ADMIN_ENDPOINTS.userPlan(id),
      input,
    );
    return res.data.data;
  },

  async changeStatus(id: string, input: AdminChangeStatusInput): Promise<AdminUserDto> {
    const res = await httpClient.patch<ApiSuccess<AdminUserDto>>(
      ADMIN_ENDPOINTS.userStatus(id),
      input,
    );
    return res.data.data;
  },

  async listCompanies(params: { q?: string; cursor?: string }): Promise<Page<AdminCompanyDto>> {
    const res = await httpClient.get<ApiSuccess<Page<AdminCompanyDto>>>(ADMIN_ENDPOINTS.companies, {
      params: { ...params, limit: 20 },
    });
    return res.data.data;
  },

  async lookupCompany(input: CompanyLookupRequestInput): Promise<CompanyLookupDto> {
    const res = await httpClient.post<ApiSuccess<CompanyLookupDto>>(
      ADMIN_ENDPOINTS.lookupCompany,
      input,
      { timeout: 90_000 },
    );
    return res.data.data;
  },

  async createCompany(input: AdminCreateCompanyInput): Promise<AdminCompanyDetailDto> {
    const res = await httpClient.post<ApiSuccess<AdminCompanyDetailDto>>(
      ADMIN_ENDPOINTS.companies,
      input,
    );
    return res.data.data;
  },

  async getCompany(id: string): Promise<AdminCompanyDetailDto> {
    const res = await httpClient.get<ApiSuccess<AdminCompanyDetailDto>>(
      ADMIN_ENDPOINTS.company(id),
    );
    return res.data.data;
  },

  async updateCompany(id: string, input: AdminUpdateCompanyInput): Promise<AdminCompanyDetailDto> {
    const res = await httpClient.patch<ApiSuccess<AdminCompanyDetailDto>>(
      ADMIN_ENDPOINTS.company(id),
      input,
    );
    return res.data.data;
  },

  async mergeCompany(id: string, input: AdminMergeCompanyInput): Promise<AdminCompanyDto> {
    const res = await httpClient.post<ApiSuccess<AdminCompanyDto>>(
      ADMIN_ENDPOINTS.mergeCompany(id),
      input,
    );
    return res.data.data;
  },

  async listAuditLogs(params: { action?: string; cursor?: string }): Promise<Page<AuditLogDto>> {
    const res = await httpClient.get<ApiSuccess<Page<AuditLogDto>>>(ADMIN_ENDPOINTS.auditLogs, {
      params: { ...params, limit: 30 },
    });
    return res.data.data;
  },

  async testAiModels(): Promise<AiHealthDto> {
    const res = await httpClient.get<ApiSuccess<AiHealthDto>>(ADMIN_ENDPOINTS.aiHealth, {
      timeout: 60000,
    });
    return res.data.data;
  },

  async getAiUsage(days: number): Promise<AdminAiUsageDto> {
    const res = await httpClient.get<ApiSuccess<AdminAiUsageDto>>(ADMIN_ENDPOINTS.aiUsage, {
      params: { days },
    });
    return res.data.data;
  },

  async previewEmail(input: AdminEmailPreviewInput): Promise<AdminEmailPreviewDto> {
    const res = await httpClient.post<ApiSuccess<AdminEmailPreviewDto>>(
      ADMIN_ENDPOINTS.emailPreview,
      input,
    );
    return res.data.data;
  },

  async sendEmail(input: AdminSendEmailInput): Promise<AdminEmailResultDto> {
    const res = await httpClient.post<ApiSuccess<AdminEmailResultDto>>(
      ADMIN_ENDPOINTS.emailSend,
      input,
      { timeout: 60_000 },
    );
    return res.data.data;
  },
};
