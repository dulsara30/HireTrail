import { type OrbitWidgetDto } from '@hiretrail/shared';
import { type WidgetFrame } from '../WidgetFrame';
import type React from 'react';

export type FrameProps = Pick<
  React.ComponentProps<typeof WidgetFrame>,
  'editMode' | 'gripProps' | 'onRemove'
>;

export interface WidgetProps {
  widget: OrbitWidgetDto;
  frame: FrameProps;
  /** Saves small per-widget settings (for example the scratchpad text). */
  onConfigChange: (config: Record<string, unknown>) => void;
}
