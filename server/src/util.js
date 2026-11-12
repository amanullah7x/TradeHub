import jwt from 'jsonwebtoken';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const now = () => new Date().toISOString();

export const addDays = (from, days) =>
  new Date(new Date(from).getTime() + days * 86400000).toISOString();

export function text(value, name, { min = 0, max = 200 } = {}) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (s.length < min) throw new HttpError(400, `${name} is required`);
  if (s.length > max) throw new HttpError(400, `${name} must be at most ${max} characters`);
  return s;
}

export function int(value, name, { min, max }) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${name} must be a whole number between ${min} and ${max}`);
  }
  return n;
}

export function oneOf(value, name, allowed) {
  if (!allowed.includes(value)) throw new HttpError(400, `${name} is not valid`);
  return value;
}

export const isPremium = (premiumUntil) => !!premiumUntil && premiumUntil > now();

export function userOut(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    city: row.city,
    phone: row.phone,
    premium: isPremium(row.premium_until),
    premiumUntil: row.premium_until,
    createdAt: row.created_at,
  };
}

export const LISTING_SELECT = `
  SELECT l.*, u.name AS owner_name, u.city AS owner_city,
         u.premium_until AS owner_premium_until, u.created_at AS owner_created_at
  FROM listings l JOIN users u ON u.id = l.user_id`;

export function listingOut(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    value: row.value,
    city: row.city,
    wants: row.wants,
    images: JSON.parse(row.images),
    status: row.status,
    featured: !!row.featured_until && row.featured_until > now(),
    featuredUntil: row.featured_until,
    views: row.views,
    createdAt: row.created_at,
    owner: {
      id: row.user_id,
      name: row.owner_name,
      city: row.owner_city,
      premium: isPremium(row.owner_premium_until),
      memberSince: row.owner_created_at,
    },
  };
}

export function authMiddleware(db, secret) {
  const findUser = db.prepare('SELECT * FROM users WHERE id = ?');

  const optional = (req, _res, next) => {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      try {
        const { sub } = jwt.verify(header.slice(7), secret);
        const user = findUser.get(sub);
        if (user && !user.deleted_at) req.user = user;
      } catch {
        // An invalid or expired token is treated the same as no token.
      }
    }
    next();
  };

  const required = (req, res, next) =>
    optional(req, res, () => {
      if (!req.user) return next(new HttpError(401, 'Please sign in to continue'));
      next();
    });

  const sign = (userId) => jwt.sign({ sub: userId }, secret, { expiresIn: '30d' });

  return { optional, required, sign };
}
