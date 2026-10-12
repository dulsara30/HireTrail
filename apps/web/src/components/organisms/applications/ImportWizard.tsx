import React from 'react';
import { CheckCircle2, FileUp, X } from 'lucide-react';
import {
  IMPORT_FIELDS,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  type ImportField,
  type ImportPreviewDto,
  type ImportResultDto,
} from '@hiretrail/shared';
import { useImportPreview } from '../../../api/hooks/mutations/useImportPreview';
import { useImportCommit } from '../../../api/hooks/mutations/useImportCommit';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';

interface ImportWizardProps {
  onClose: () => void;
}

const FIELD_LABELS: Record<ImportField, string> = {
  company: 'Company *',
  roleTitle: 'Role title *',
  status: 'Status',
  priority: 'Priority',
  workMode: 'Work mode',
  jobType: 'Job type',
  level: 'Level',
  source: 'Source',
  cvVersion: 'CV version',
  coverLetter: 'Cover letter (Yes/No)',
  location: 'Location',
  jobUrl: 'Job link',
  salaryMin: 'Salary min',
  salaryMax: 'Salary max',
  salaryCurrency: 'Currency',
  salaryPeriod: 'Salary period',
  expectedSalary: 'Expected salary',
  appliedDate: 'Applied date',
  deadline: 'Deadline',
  followUp: 'Follow-up date',
  jobDescription: 'Job description',
  notes: 'Notes',
};

type Step = 'upload' | 'map' | 'done';
const selectClass =
  'w-full rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

export const ImportWizard: React.FC<ImportWizardProps> = ({ onClose }) => {
  const preview = useImportPreview();
  const commit = useImportCommit();
  const [step, setStep] = React.useState<Step>('upload');
  const [data, setData] = React.useState<ImportPreviewDto | null>(null);
  const [mapping, setMapping] = React.useState<Partial<Record<ImportField, string>>>({});
  const [createMissing, setCreateMissing] = React.useState(true);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResultDto | null>(null);

  const handleFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (file.size > IMPORT_MAX_BYTES) {
      setFileError('The file is larger than 1 MB.');
      return;
    }
    const text = await file.text();
    preview.mutate(
      { fileName: file.name, text },
      {
        onSuccess: (res) => {
          setData(res);
          setMapping(res.suggestedMapping);
          setStep('map');
        },
      },
    );
  };

  const canImport = Boolean(mapping.company && mapping.roleTitle) && !commit.isPending;

  const handleCommit = () => {
    if (!data) return;
    commit.mutate(
      {
        importId: data.importId,
        mapping: mapping as Record<ImportField, string | undefined>,
        createMissingOptions: createMissing,
      },
      {
        onSuccess: (res) => {
          setResult(res);
          setStep('done');
        },
      },
    );
  };

  const unknownCount = data
    ? Object.values(data.unknownOptions).reduce((n, list) => n + (list?.length ?? 0), 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="fixed inset-0 bg-bg-inverse/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="relative z-10 flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border-default border-t-4 border-t-border-accent bg-bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-default bg-bg-accent-subtle px-5 py-4">
          <h2
            id="import-title"
            className="flex items-center gap-2 text-base font-bold text-text-primary"
          >
            <FileUp className="h-5 w-5 text-text-accent" aria-hidden="true" />
            Import applications from CSV
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close import">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          {step === 'upload' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Upload a CSV (for example exported from Google Sheets). Up to {IMPORT_MAX_ROWS} rows
                and 1 MB. You will check the columns and a preview before anything is imported.
              </p>
              <label
                htmlFor="import-file"
                className="flex min-h-[10rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-bg-subtle p-6 text-center text-sm text-text-secondary focus-within:ring-2 focus-within:ring-border-accent hover:bg-bg-accent-subtle"
              >
                {preview.isPending ? (
                  <Spinner size="md" />
                ) : (
                  <>
                    <FileUp className="h-6 w-6 text-text-accent" aria-hidden="true" />
                    <span className="font-semibold text-text-primary">Choose a CSV file</span>
                  </>
                )}
                <input
                  id="import-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
              </label>
              {(fileError || preview.isError) && (
                <p role="alert" className="text-xs text-text-danger">
                  {fileError ?? preview.error?.message}
                </p>
              )}
            </div>
          )}

          {step === 'map' && data && (
            <>
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{data.fileName}</span>:{' '}
                {data.rowCount} rows. Match each field to a column.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field} className="space-y-1">
                    <label
                      htmlFor={`map-${field}`}
                      className="text-xs font-semibold uppercase text-text-secondary"
                    >
                      {FIELD_LABELS[field]}
                    </label>
                    <select
                      id={`map-${field}`}
                      value={mapping[field] ?? ''}
                      onChange={(e) =>
                        setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))
                      }
                      className={selectClass}
                    >
                      <option value="">Skip</option>
                      {data.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {unknownCount > 0 && (
                <div className="space-y-2 rounded-lg border border-border-accent bg-bg-accent-subtle p-3 text-sm">
                  <p className="font-semibold text-text-primary">
                    {unknownCount} value{unknownCount === 1 ? '' : 's'} are not in your options yet
                  </p>
                  <ul className="space-y-0.5 text-xs text-text-secondary">
                    {Object.entries(data.unknownOptions).map(([field, values]) => (
                      <li key={field}>
                        <span className="font-semibold">{FIELD_LABELS[field as ImportField]}:</span>{' '}
                        {values?.join(', ')}
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-center gap-2 text-xs font-medium text-text-primary">
                    <input
                      type="checkbox"
                      checked={createMissing}
                      onChange={(e) => setCreateMissing(e.target.checked)}
                    />
                    Create these as new options
                  </label>
                </div>
              )}

              {data.sampleErrors.length > 0 && (
                <div
                  role="alert"
                  className="space-y-1 rounded-lg border border-border-danger bg-bg-danger-subtle p-3 text-xs text-text-danger"
                >
                  <p className="font-semibold">
                    Problems in the first rows (these rows will be skipped):
                  </p>
                  <ul className="list-disc pl-5">
                    {data.sampleErrors.map((e) => (
                      <li key={e.row}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-text-secondary">
                  Preview (first {data.sampleRows.length} rows)
                </p>
                <div className="overflow-x-auto rounded-lg border border-border-default">
                  <table className="w-full min-w-[32rem] text-left text-xs">
                    <thead className="bg-bg-muted font-semibold text-text-secondary">
                      <tr>
                        {data.headers.map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-2">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {data.sampleRows.map((row, i) => (
                        <tr key={i}>
                          {data.headers.map((h) => (
                            <td key={h} className="max-w-[14rem] truncate px-3 py-1.5">
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {commit.isError && (
                <p role="alert" className="text-xs text-text-danger">
                  {commit.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-border-default pt-4">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCommit} disabled={!canImport}>
                  {commit.isPending ? (
                    <>
                      <Spinner size="sm" /> Importing…
                    </>
                  ) : (
                    `Import ${data.rowCount} rows`
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'done' && result && (
            <div className="space-y-4" role="status">
              <p className="flex items-center gap-2 text-base font-bold text-text-success">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                {result.created} application{result.created === 1 ? '' : 's'} imported
              </p>
              <p className="text-sm text-text-secondary">
                {result.skipped} skipped · {result.createdOptions} new option
                {result.createdOptions === 1 ? '' : 's'} created.
              </p>
              {result.errors.length > 0 && (
                <ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto rounded-lg border border-border-danger bg-bg-danger-subtle p-3 pl-7 text-xs text-text-danger">
                  {result.errors.map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end">
                <Button variant="primary" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
