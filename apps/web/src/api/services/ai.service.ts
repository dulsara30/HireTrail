import { httpClient } from '../client/http-client';
import { AI_ENDPOINTS } from '../endpoints/ai.endpoints';
import {
  type ApiSuccess,
  type AiUsageDto,
  type AutofillDraftDto,
  type AutofillRequestInput,
} from '@hiretrail/shared';

export const aiService = {
  async autofill(input: AutofillRequestInput): Promise<AutofillDraftDto> {
    const res = await httpClient.post<ApiSuccess<AutofillDraftDto>>(AI_ENDPOINTS.autofill, input, {
      timeout: 60_000,
    });
    return res.data.data;
  },

  async usage(): Promise<AiUsageDto> {
    const res = await httpClient.get<ApiSuccess<AiUsageDto>>(AI_ENDPOINTS.usage);
    return res.data.data;
  },
};
