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

/** How long the Picker may stay open without a result before we show the cookie hint. */
const SLOW_MS = 12000;

/**
 * "Choose from Google Drive" button. Hidden when the Google env values are not set.
 * Google's Picker runs in an iframe and fails (often with "API developer key is invalid") when the
 * browser blocks third-party cookies. Browsers give no way to detect that, so we explain it up front.
 */
export const DriveResumePicker: React.FC<DriveResumePickerProps> = ({ onPick }) => {
  const [busy, setBusy] = React.useState(false);
  const [slow, setSlow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!isPickerConfigured()) return null;

  const open = async () => {
    setBusy(true);
    setSlow(false);
    setError(null);
    timer.current = setTimeout(() => setSlow(true), SLOW_MS);
    try {
      const file = await pickDriveFile();
      if (file) onPick(file);
    } catch {
      setError('Could not open Google Drive. Check pop-up blockers and try again.');
    } finally {
      if (timer.current) clearTimeout(timer.current);
      setBusy(false);
      setSlow(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" size="sm" onClick={open} disabled={busy && !slow}>
        {busy && !slow ? (
          <Spinner size="sm" />
        ) : (
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
        )}
        Choose from Google Drive
      </Button>
      {error && (
        <p role="alert" className="text-xs text-text-danger">
          {error}
        </p>
      )}
      <p
        role={slow ? 'alert' : undefined}
        className={slow ? 'text-xs font-medium text-text-danger' : 'text-[11px] text-text-tertiary'}
      >
        {slow
          ? 'Google Drive is not responding. If you see an error such as "API developer key is invalid", allow third-party cookies for this site (lock icon next to the address bar → Cookies), then try again. You can also paste a link instead.'
          : 'Needs third-party cookies allowed for this site. If Google shows an error, allow them or paste a link instead.'}
      </p>
    </div>
  );
};
