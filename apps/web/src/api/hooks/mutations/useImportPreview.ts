import { useMutation } from '@tanstack/react-query';
import { type ImportPreviewDto } from '@hiretrail/shared';
import { dataTransferService } from '../../services/data-transfer.service';
import { type ApiError } from '../../client/api-error';

export function useImportPreview() {
  return useMutation<ImportPreviewDto, ApiError, { fileName: string; text: string }>({
    mutationFn: ({ fileName, text }) => dataTransferService.previewImport(fileName, text),
  });
}
