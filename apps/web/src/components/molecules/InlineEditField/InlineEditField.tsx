import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../../utils/helpers/class-names';

interface InlineEditFieldProps {
  label: string;
  value: string;
  onSave: (val: string) => Promise<void> | void;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'number';
  className?: string;
  disabled?: boolean;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  label,
  value,
  onSave,
  placeholder = 'Click to edit...',
  type = 'text',
  className,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleCommit = async () => {
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }

    setStatus('saving');
    setErrorMessage(null);
    try {
      await onSave(currentValue);
      setStatus('saved');
      setIsEditing(false);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage((err as Error)?.message || 'Failed to save');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && type === 'textarea') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
      setStatus('idle');
    }
  };

  return (
    <div className={cn('group relative flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider">
        <span>{label}</span>
        {status === 'saving' && (
          <span className="text-text-muted text-[10px] animate-pulse">Saving…</span>
        )}
        {status === 'saved' && <span className="text-success text-[10px]">Saved ✓</span>}
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-1">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="w-full px-2.5 py-1.5 text-sm bg-bg border border-border-interactive focus:outline-none focus:ring-1 focus:ring-accent rounded-sm resize-y min-h-[72px]"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="w-full px-2.5 py-1.5 text-sm bg-bg border border-border-interactive focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
            />
          )}
          {errorMessage && <span className="text-xs text-danger">{errorMessage}</span>}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setIsEditing(true)}
          onKeyDown={(e) => e.key === 'Enter' && !disabled && setIsEditing(true)}
          className={cn(
            'min-h-[32px] px-2 py-1 text-sm rounded-sm transition-colors cursor-pointer select-none border border-transparent hover:border-border hover:bg-bg-subtle flex items-center',
            !value && 'text-text-muted italic',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {value || placeholder}
        </div>
      )}
    </div>
  );
};
