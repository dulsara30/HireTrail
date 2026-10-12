import { type IncomingMessage, type ServerResponse } from 'node:http';
import { app } from './app';
import { config } from './config/config';
import { connectDatabase } from './core/db/connection';
import { logger } from './core/logger/logger';

/**
 * Serverless entry (Vercel). Local development uses server.ts instead.
 * The MongoDB connection is opened on first use and reused by later requests of the same instance.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await connectDatabase(config.mongodbUri, config.mongodbDbName);
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    // The health endpoint still answers (and reports the database as down); everything else stops here
    if (!req.url?.includes('/health')) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'The service is temporarily unavailable' },
        }),
      );
      return;
    }
  }
  app(req, res);
}
