import { OptionDto } from './option.dto';
import { ApplicationListItemDto } from './application.dto';

export interface BoardLaneDto {
  status: OptionDto;
  total: number;
  items: ApplicationListItemDto[];
  nextCursor?: string | null;
}

export interface BoardDto {
  lanes: BoardLaneDto[];
}
