import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import {
  isPickerConfigured,
  pickDriveFile,
  type PickedDriveFile,
} from '../../../utils/helpers/google-picker';

interface DriveResumePickerProps {
  onPick: (file: PickedDriveFile) => void;
}

/** "Choose from Google Drive" button. Hidden when the Google env values are not set. */
export const DriveResumePicker: React.FC<DriveResumePickerProps> = ({ onPick }) => {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isPickerConfigured()) return null;

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      const file = await pickDriveFile();
      if (file) onPick(file);
    } catch {
      setError('Could not open Google Drive. Check pop-up blockers and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" size="sm" onClick={open} disabled={busy}>
        {busy ? <Spinner size="sm" /> : <FolderOpen className="h-4 w-4" aria-hidden="true" />}
        Choose from Google Drive
      </Button>
      {error && (
        <p role="alert" className="text-xs text-text-danger">
          {error}
        </p>
      )}
    </div>
  );
};
