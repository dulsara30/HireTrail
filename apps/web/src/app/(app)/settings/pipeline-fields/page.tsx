'use client';

import React, { useState } from 'react';
import { useOptions } from '../../../../api/hooks/queries/useOptions';
import { optionsService } from '../../../../api/services/options.service';
import { OptionType } from '@hiretrail/shared';
import { Badge } from '../../../../components/atoms/Badge';
import { Button } from '../../../../components/atoms/Button';
import { Spinner } from '../../../../components/atoms/Spinner';
import { Plus, RotateCcw, Archive } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { optionKeys } from '../../../../api/query-keys/options.keys';

export default function PipelineFieldsPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<OptionType>(OptionType.STATUS);
  const [newLabel, setNewLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { data: options = [], isLoading } = useOptions(selectedType, true);
  const optionList = Array.isArray(options) ? options : [];

  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    setIsSubmitting(true);
    try {
      await optionsService.create({
        type: selectedType,
        label: newLabel.trim(),
        color: 'accent',
      });
      setNewLabel('');
      queryClient.invalidateQueries({ queryKey: optionKeys.all });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveOption = async (id: string) => {
    try {
      await optionsService.archive(id, {});
      queryClient.invalidateQueries({ queryKey: optionKeys.all });
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: { message?: string } } }; message?: string })
          ?.response?.data?.error?.message ||
        (err as Error)?.message ||
        'Cannot archive option';
      alert(errorMsg);
    }
  };

  const handleRestoreOption = async (id: string) => {
    await optionsService.restore(id);
    queryClient.invalidateQueries({ queryKey: optionKeys.all });
  };

  const handleResetDefaults = async () => {
    if (!confirm(`Reset default options for ${selectedType}? Missing defaults will be restored.`))
      return;

    setIsResetting(true);
    try {
      await optionsService.resetDefaults({ type: selectedType });
      queryClient.invalidateQueries({ queryKey: optionKeys.all });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Pipeline & Fields</h1>
          <p className="text-xs text-text-muted">
            Manage status lanes, priorities, work modes, and tags
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleResetDefaults} disabled={isResetting}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          {isResetting ? 'Resetting…' : 'Restore Defaults'}
        </Button>
      </div>

      {/* Option Type Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {Object.values(OptionType).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              selectedType === type
                ? 'bg-accent text-accent-fg'
                : 'text-text-muted hover:text-text hover:bg-bg-subtle'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Add new option form */}
      <form onSubmit={handleCreateOption} className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={`Add new ${selectedType.toLowerCase()}…`}
          className="flex-1 px-3 py-1.5 text-sm bg-bg border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting || !newLabel.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </form>

      {/* List */}
      <div className="rounded-md border border-border bg-bg divide-y divide-border">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : optionList.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">No options configured</div>
        ) : (
          optionList.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Badge color={opt.color} dot>
                  {opt.label}
                </Badge>
                {opt.archivedAt && (
                  <span className="text-[10px] text-text-muted bg-bg-subtle px-1.5 py-0.5 rounded border border-border">
                    Archived
                  </span>
                )}
              </div>
              <div>
                {opt.archivedAt ? (
                  <Button variant="ghost" size="sm" onClick={() => handleRestoreOption(opt.id)}>
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-text-muted hover:text-danger"
                    onClick={() => handleArchiveOption(opt.id)}
                    aria-label={`Archive ${opt.label}`}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
