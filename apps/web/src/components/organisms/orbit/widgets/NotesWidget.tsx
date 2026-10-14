import React from 'react';
import { StickyNote } from 'lucide-react';
import { ORBIT_TEXT_LIMITS } from '@hiretrail/shared';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

/** A free note that lives on the board and is saved with the layout. */
export const NotesWidget: React.FC<WidgetProps> = ({ widget, frame, onConfigChange }) => {
  const saved = typeof widget.config.text === 'string' ? widget.config.text : '';
  const [text, setText] = React.useState(saved);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = React.useRef(widget.config);
  config.current = widget.config;

  const change = (value: string) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onConfigChange({ ...config.current, text: value }), 800);
  };

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <WidgetFrame
      title="Scratchpad"
      icon={StickyNote}
      {...frame}
      actions={
        <span className="text-[11px] text-text-tertiary">
          {text.length}/{ORBIT_TEXT_LIMITS.WIDGET_NOTE_MAX}
        </span>
      }
    >
      <textarea
        value={text}
        onChange={(e) => change(e.target.value)}
        maxLength={ORBIT_TEXT_LIMITS.WIDGET_NOTE_MAX}
        aria-label="Scratchpad"
        placeholder="Jot something down: a recruiter name, a question to ask, a number to call."
        className="h-full min-h-[4rem] w-full resize-none rounded-md border-0 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
      />
    </WidgetFrame>
  );
};
