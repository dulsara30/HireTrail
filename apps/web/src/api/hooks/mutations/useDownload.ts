import { useMutation } from '@tanstack/react-query';
import { dataTransferService } from '../../services/data-transfer.service';
import { saveBlob } from '../../../utils/helpers/download';
import { type ApiError } from '../../client/api-error';

type Kind = 'applications-csv' | 'account-zip';

/** Downloads a generated file: the applications CSV or the full account ZIP. */
export function useDownload() {
  return useMutation<void, ApiError, Kind>({
    mutationFn: async (kind) => {
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === 'applications-csv') {
        const blob = await dataTransferService.exportApplicationsCsv();
        saveBlob(blob, `hiretrail-applications-${stamp}.csv`);
      } else {
        const blob = await dataTransferService.exportAccountZip();
        saveBlob(blob, `hiretrail-export-${stamp}.zip`);
      }
    },
  });
}
