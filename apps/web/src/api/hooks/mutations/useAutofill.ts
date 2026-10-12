import { useMutation } from '@tanstack/react-query';
import { type AutofillDraftDto, type AutofillRequestInput } from '@hiretrail/shared';
import { aiService } from '../../services/ai.service';
import { type ApiError } from '../../client/api-error';

export function useAutofill() {
  return useMutation<AutofillDraftDto, ApiError, AutofillRequestInput>({
    mutationFn: (input) => aiService.autofill(input),
  });
}
