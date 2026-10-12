import { OptionType, OptionColor } from '../../constants/options';

export interface OptionDto {
  id: string;
  userId: string;
  type: OptionType;
  key?: string;
  label: string;
  color: OptionColor;
  order: string;
  meta?: Record<string, unknown>;
  aliases?: string[];
  archivedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
