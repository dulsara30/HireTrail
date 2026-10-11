import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/config';
import { requestIdMiddleware } from './core/middleware/request-id.middleware';
import { httpLoggerMiddleware } from './core/middleware/http-logger.middleware';
import { ipRateLimitMiddleware } from './core/middleware/rate-limit.middleware';
import { notFoundMiddleware } from './core/middleware/not-found.middleware';
import { errorHandlerMiddleware } from './core/middleware/error-handler.middleware';
import { container } from './core/container/container';
import { createHealthRouter } from './modules/health/health.routes';

export function createApp(): Express {
  const app = express();

  // 1. requestId: assign / echo x-request-id
  app.use(requestIdMiddleware);

  // 2. httpLogger: pino logger without bodies or tokens
  app.use(httpLoggerMiddleware);

  // 3. helmet: security headers
  app.use(helmet());

  // 4. cors: origin allowlist
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
    }),
  );

  // 5. express.json: limit 1 MB; urlencoded disabled
  app.use(express.json({ limit: '1mb' }));

  // 6. cookie-parser
  app.use(cookieParser(config.cookieSecret));

  // 7. ipRateLimit
  app.use(ipRateLimitMiddleware);

  // 8. routes
  app.use('/api/v1/health', createHealthRouter(container.healthController));
  // Mount /health alias for direct root health checks
  app.use('/health', createHealthRouter(container.healthController));

  // 9. notFound: route not found envelope
  app.use(notFoundMiddleware);

  // 10. errorHandler: centralized error formatting
  app.use(errorHandlerMiddleware);

  return app;
}

export const app = createApp();
