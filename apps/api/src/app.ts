import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/config';
import { requestIdMiddleware } from './core/middleware/request-id.middleware';
import { httpLoggerMiddleware } from './core/middleware/http-logger.middleware';
import { globalApiRateLimit } from './core/middleware/rate-limit.middleware';
import { notFoundMiddleware } from './core/middleware/not-found.middleware';
import { errorHandlerMiddleware } from './core/middleware/error-handler.middleware';
import { container } from './core/container/container';
import { createHealthRouter } from './modules/health/health.routes';
import { createAuthRoutes } from './modules/auth/auth.routes';
import { createMeRoutes } from './modules/users/me.routes';
import { createOptionRoutes } from './modules/options/option.routes';
import { createAdminRoutes } from './modules/admin/admin.routes';
import { createAiRoutes } from './modules/ai/ai.routes';
import { createCompanyRoutes } from './modules/companies/company.routes';
import { createCommentRoutes } from './modules/comments/comment.routes';
import { createApplicationRoutes } from './modules/applications/application.routes';
import { createDashboardRoutes } from './modules/dashboard/dashboard.routes';

export function createApp(): Express {
  const app = express();

  // TODO: Verify real-IP forwarded header on first Vercel preview deployment
  // Options: 'x-forwarded-for', 'x-real-ip', 'x-vercel-forwarded-for'
  app.set('trust proxy', 1);

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

  // 7. ipRateLimit: global 300 req / 5 min
  app.use(globalApiRateLimit);

  // 8. routes
  app.use('/api/v1/health', createHealthRouter(container.healthController));
  app.use('/health', createHealthRouter(container.healthController));
  app.use('/api/v1/auth', createAuthRoutes(container.authController, container.authenticate));
  app.use('/api/v1/me', createMeRoutes(container.meController, container.authenticate));
  app.use(
    '/api/v1/options',
    container.authenticate,
    createOptionRoutes(container.optionController),
  );
  app.use(
    '/api/v1/companies',
    container.authenticate,
    createCompanyRoutes(container.companyController, container.companyAiController),
  );
  app.use(
    '/api/v1/comments',
    container.authenticate,
    createCommentRoutes(container.commentController),
  );
  app.use(
    '/api/v1/applications',
    container.authenticate,
    createApplicationRoutes(
      container.applicationController,
      container.commentController,
      container.activityController,
      container.applicationDataController,
    ),
  );
  app.use('/api/v1/admin', container.authenticate, createAdminRoutes(container.adminController));
  app.use('/api/v1/ai', container.authenticate, createAiRoutes(container.aiController));
  app.use(
    '/api/v1/dashboard',
    container.authenticate,
    createDashboardRoutes(container.dashboardController),
  );

  // 9. notFound: route not found envelope
  app.use(notFoundMiddleware);

  // 10. errorHandler: centralized error formatting
  app.use(errorHandlerMiddleware);

  return app;
}

export const app = createApp();
