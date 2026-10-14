import { useMutation } from '@tanstack/react-query';
import { type OrbitQuickParseDto } from '@hiretrail/shared';
import { orbitService } from '../../services/orbit.service';
import { type ApiError } from '../../client/api-error';

/** Asks the AI to read one sentence. The answer only fills the preview; nothing is saved. */
export function useOrbitQuickParse() {
  return useMutation<OrbitQuickParseDto, ApiError, string>({
    mutationFn: (text) => orbitService.parseText(text, -new Date().getTimezoneOffset()),
  });
}
