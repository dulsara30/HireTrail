export interface HealthDto {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  version: string;
}

export * from './auth.dto';
export * from './option.dto';
export * from './company.dto';
export * from './application.dto';
export * from './board.dto';
export * from './comment.dto';
export * from './dashboard.dto';
export * from './ai.dto';
export * from './admin.dto';
export * from './data-transfer.dto';
