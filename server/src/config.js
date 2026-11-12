import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const production = process.env.NODE_ENV === 'production';

if (production && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  production,
  port: Number(process.env.PORT) || 4000,
  dbFile: process.env.DB_FILE || path.join(root, 'data', 'tradehub.db'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'data', 'uploads'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  paymentsMode: process.env.PAYMENTS_MODE || 'test',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  corsOrigin: process.env.CORS_ORIGIN || '',
  // Folder with the built website (app/dist). When it exists the API server also serves the site.
  webDir: process.env.WEB_DIR || path.resolve(root, '..', 'app', 'dist'),
  // Number of reverse proxies in front of the server, so rate limits see the real visitor IP.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
};
