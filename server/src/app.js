import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIES, CONDITIONS, CURRENCY } from './meta.js';
import { HttpError, authMiddleware } from './util.js';
import { authRoutes } from './routes/auth.js';
import { listingRoutes } from './routes/listings.js';
import { offerRoutes } from './routes/offers.js';
import { monetizationRoutes } from './routes/monetization.js';
import { moderationRoutes } from './routes/moderation.js';

const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
  });

export function createApp({
  db,
  jwtSecret,
  uploadsDir,
  paymentsMode = 'test',
  adminEmails = [],
  corsOrigin = '',
  production = false,
  webDir = '',
  trustProxy = 0,
  // Tests turn this off so they can make many requests from one address.
  rateLimits = true,
}) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const app = express();
  const ctx = { db, auth: authMiddleware(db, jwtSecret), uploadsDir, paymentsMode, adminEmails };

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // React Native Web injects its styles at runtime.
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      // Photos are loaded by the app from another origin during development and on mobile.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // In production the website is served from this same server, so other sites are
  // only allowed to call the API when CORS_ORIGIN names them. Mobile apps are unaffected.
  if (corsOrigin) app.use(cors({ origin: corsOrigin.split(',').map((s) => s.trim()) }));
  else if (!production) app.use(cors());

  if (rateLimits) {
    app.use('/api', limiter(1, 300, 'Too many requests. Please slow down and try again in a minute.'));
    // Slows down password guessing and mass sign-ups.
    app.use('/api/auth', limiter(15, 20, 'Too many attempts. Please try again in 15 minutes.'));
    const writes = limiter(10, 120, 'You are doing that too often. Please try again in a few minutes.');
    app.use('/api', (req, res, next) => (req.method === 'GET' ? next() : writes(req, res, next)));
  }

  // Photos are sent as base64 inside the JSON body, hence the generous limit.
  app.use(express.json({ limit: '45mb' }));
  app.use(
    '/uploads',
    express.static(uploadsDir, { maxAge: '30d', immutable: true, index: false, dotfiles: 'deny' }),
  );

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/meta', (_req, res) => res.json({ categories: CATEGORIES, conditions: CONDITIONS, currency: CURRENCY }));
  app.use('/api', authRoutes(ctx));
  app.use('/api', listingRoutes(ctx));
  app.use('/api', offerRoutes(ctx));
  app.use('/api', monetizationRoutes(ctx));
  app.use('/api', moderationRoutes(ctx));

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

  // Serve the built website, sending every other path to the app so its own routing takes over.
  const indexFile = webDir && path.join(webDir, 'index.html');
  if (indexFile && fs.existsSync(indexFile)) {
    app.use(express.static(webDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/uploads/')) return next();
      res.set('Cache-Control', 'no-cache').sendFile(indexFile);
    });
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Photos are too large to upload' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
