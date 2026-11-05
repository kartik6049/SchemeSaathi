/**
 * Express application factory.
 * Builds the app without listening, so tests can mount it with supertest.
 *
 * Middleware order: security headers -> CORS -> body/cookie parsing ->
 * logging -> rate limit -> routes -> 404 -> error handler.
 */
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createApiLimiter } from './middleware/rateLimiters.js';
import { requestLogger } from './middleware/requestLogger.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { createAuthRouter } from './modules/admin/auth.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { checklistRouter } from './modules/checklist/checklist.routes.js';
import { matchRouter } from './modules/match/match.routes.js';
import { questionsRouter } from './modules/questions/questions.routes.js';
import { schemesRouter } from './modules/schemes/schemes.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Trust only local / private-network proxies (Vite dev proxy, nginx container).
  app.set('trust proxy', 'loopback, uniquelocal');

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get('/api/health', async (_req, res) => {
    let db = 'up';
    try {
      await pool.query('SELECT 1');
    } catch {
      db = 'down';
    }
    res.status(db === 'up' ? 200 : 503).json({ status: db === 'up' ? 'ok' : 'degraded', db });
  });

  const api = express.Router();
  api.use(createApiLimiter());
  api.use('/questions', questionsRouter);
  api.use('/match', matchRouter);
  api.use('/schemes', schemesRouter);
  api.use('/checklist', checklistRouter);
  api.use('/events', analyticsRouter);
  api.use('/admin/auth', createAuthRouter());
  api.use('/admin', adminRouter);
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
