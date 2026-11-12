import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { tx } from '../db.js';
import { closeOffersFor } from './offers.js';
import { CATEGORIES, CONDITIONS, FREE_LISTING_LIMIT } from '../meta.js';
import { HttpError, LISTING_SELECT, int, isPremium, listingOut, now, oneOf, text } from '../util.js';

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VALUE = 2_000_000_000;

// Checks the file's leading bytes, so only real images are ever stored and served.
function looksLikeImage(data) {
  const hex = data.subarray(0, 12).toString('hex');
  return (
    hex.startsWith('89504e470d0a1a0a') || // PNG
    hex.startsWith('ffd8ff') || // JPEG
    (hex.startsWith('52494646') && hex.slice(16) === '57454250') // WebP
  );
}

export function listingRoutes({ db, auth, uploadsDir }) {
  const router = Router();

  // Photos arrive as base64 data URLs so the same upload code works on web and mobile.
  function saveImages(images) {
    if (!Array.isArray(images)) return [];
    if (images.length > MAX_IMAGES) throw new HttpError(400, `You can add up to ${MAX_IMAGES} photos`);
    return images.map((image) => {
      const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(image);
      if (!match) throw new HttpError(400, 'Photos must be PNG, JPEG or WebP images');
      const data = Buffer.from(match[2], 'base64');
      if (!looksLikeImage(data)) throw new HttpError(400, 'Photos must be PNG, JPEG or WebP images');
      if (data.length > MAX_IMAGE_BYTES) throw new HttpError(400, 'Each photo must be smaller than 5 MB');
      const name = `${crypto.randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
      fs.writeFileSync(path.join(uploadsDir, name), data);
      return `/uploads/${name}`;
    });
  }

  router.get('/listings', auth.optional, (req, res) => {
    const { q, category, city, sort, mine, user } = req.query;
    const where = [];
    const params = [];
    if (mine) {
      if (!req.user) throw new HttpError(401, 'Please sign in to continue');
      where.push("l.user_id = ? AND l.status != 'removed'");
      params.push(req.user.id);
    } else {
      where.push("l.status = 'active'");
    }
    if (user) {
      where.push('l.user_id = ?');
      params.push(Number(user));
    }
    if (category) {
      where.push('l.category = ?');
      params.push(String(category));
    }
    if (city) {
      where.push('l.city LIKE ?');
      params.push(`%${String(city).trim()}%`);
    }
    if (q) {
      where.push('(l.title LIKE ? OR l.description LIKE ? OR l.wants LIKE ?)');
      const like = `%${String(q).trim()}%`;
      params.push(like, like, like);
    }
    const order =
      sort === 'value_asc' ? 'l.value ASC' : sort === 'value_desc' ? 'l.value DESC' : 'l.created_at DESC';
    // Featured (paid) listings always sort first.
    const rows = db
      .prepare(
        `${LISTING_SELECT} WHERE ${where.join(' AND ')}
         ORDER BY (l.featured_until IS NOT NULL AND l.featured_until > ?) DESC, ${order}, l.id DESC
         LIMIT 120`,
      )
      .all(...params, now());
    res.json({ listings: rows.map(listingOut) });
  });

  router.get('/listings/:id', auth.optional, (req, res) => {
    const row = db.prepare(`${LISTING_SELECT} WHERE l.id = ?`).get(Number(req.params.id));
    if (!row || row.status === 'removed') throw new HttpError(404, 'This item is no longer available');
    if (!req.user || req.user.id !== row.user_id) {
      db.prepare('UPDATE listings SET views = views + 1 WHERE id = ?').run(row.id);
    }
    res.json({ listing: listingOut(row) });
  });

  router.post('/listings', auth.required, (req, res) => {
    const title = text(req.body.title, 'Title', { min: 3, max: 90 });
    const description = text(req.body.description, 'Description', { max: 3000 });
    const category = oneOf(req.body.category, 'Category', CATEGORIES);
    const condition = oneOf(req.body.condition, 'Condition', CONDITIONS);
    const value = int(req.body.value, 'Estimated value', { min: 1, max: MAX_VALUE });
    const city = text(req.body.city, 'City', { min: 2, max: 60 });
    const wants = text(req.body.wants, 'What you want in return', { max: 300 });

    if (!isPremium(req.user.premium_until)) {
      const { n } = db
        .prepare("SELECT COUNT(*) AS n FROM listings WHERE user_id = ? AND status = 'active'")
        .get(req.user.id);
      if (n >= FREE_LISTING_LIMIT) {
        throw new HttpError(
          403,
          `Free accounts can list up to ${FREE_LISTING_LIMIT} items at a time. Go Premium for unlimited listings.`,
        );
      }
    }

    const images = saveImages(req.body.images);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO listings (user_id, title, description, category, condition, value, city, wants, images, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(req.user.id, title, description, category, condition, value, city, wants, JSON.stringify(images), now());
    const row = db.prepare(`${LISTING_SELECT} WHERE l.id = ?`).get(lastInsertRowid);
    res.status(201).json({ listing: listingOut(row) });
  });

  router.delete('/listings/:id', auth.required, (req, res) => {
    const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(Number(req.params.id));
    if (!row || row.user_id !== req.user.id) throw new HttpError(404, 'Item not found');
    if (row.status === 'traded') throw new HttpError(409, 'This item has already been traded');
    tx(db, () => {
      db.prepare("UPDATE listings SET status = 'removed' WHERE id = ?").run(row.id);
      closeOffersFor(db, [row.id], `This offer was closed because "${row.title}" was removed.`);
    });
    res.json({ ok: true });
  });

  return router;
}
