import React from 'react';
import { Trash2 } from 'lucide-react';
import { useDeleteApplicationPermanently } from '../../../api/hooks/mutations/useDeleteApplicationPermanently';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';

interface DeleteApplicationDialogProps {
  application: { id: string; roleTitle: string; companyName: string };
  onClose: () => void;
  onDeleted?: () => void;
}

/** Confirms and permanently deletes one application (with its comments and history). */
export const DeleteApplicationDialog: React.FC<DeleteApplicationDialogProps> = ({
  application,
  onClose,
  onDeleted,
}) => {
  const remove = useDeleteApplicationPermanently();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-bg-inverse/50" onClick={onClose} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="relative z-10 w-full max-w-md space-y-4 rounded-xl border border-border-danger bg-bg-surface p-5 shadow-lg"
      >
        <h3 id="delete-dialog-title" className="text-base font-bold text-text-primary">
          Delete this application permanently?
        </h3>
        <p className="text-sm text-text-secondary">
          “{application.roleTitle}” at {application.companyName}, with all its comments and history,
          will be removed for good. This cannot be undone.
        </p>
        {remove.isError && (
          <p role="alert" className="text-xs text-text-danger">
            {remove.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(application.id, {
                onSuccess: () => {
                  onDeleted?.();
                  onClose();
                },
              })
            }
          >
            {remove.isPending ? (
              <Spinner size="sm" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            Delete permanently
          </Button>
        </div>
      </div>
    </div>
  );
};
