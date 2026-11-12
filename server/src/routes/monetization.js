import { Router } from 'express';
import { tx } from '../db.js';
import { CURRENCY, FREE_LISTING_LIMIT, PRODUCTS } from '../meta.js';
import { HttpError, addDays, isPremium, now, text, userOut } from '../util.js';

export function monetizationRoutes({ db, auth, paymentsMode, adminEmails }) {
  const router = Router();

  router.get('/products', (_req, res) => {
    res.json({
      currency: CURRENCY,
      testMode: paymentsMode !== 'live',
      freeListingLimit: FREE_LISTING_LIMIT,
      products: Object.entries(PRODUCTS).map(([id, p]) => ({ id, ...p })),
    });
  });

  // Until a real payment provider is connected (PAYMENTS_MODE=live), checkout runs
  // in test mode: the order is recorded and applied straight away, no money moves.
  router.post('/checkout', auth.required, (req, res) => {
    const product = PRODUCTS[req.body.product];
    if (!product) throw new HttpError(400, 'Unknown product');
    if (paymentsMode === 'live') {
      throw new HttpError(501, 'Online payments are not connected yet');
    }

    tx(db, () => {
      const stamp = now();
      let listingId = null;
      if (product.kind === 'boost') {
        const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(Number(req.body.listingId));
        if (!listing || listing.user_id !== req.user.id || listing.status !== 'active') {
          throw new HttpError(400, 'Pick one of your active items to feature');
        }
        listingId = listing.id;
        // Buying again while already featured extends the current period.
        const from = listing.featured_until && listing.featured_until > stamp ? listing.featured_until : stamp;
        db.prepare('UPDATE listings SET featured_until = ? WHERE id = ?').run(addDays(from, product.days), listing.id);
      } else {
        const from = isPremium(req.user.premium_until) ? req.user.premium_until : stamp;
        db.prepare('UPDATE users SET premium_until = ? WHERE id = ?').run(addDays(from, product.days), req.user.id);
      }
      db.prepare(
        `INSERT INTO payments (user_id, product, listing_id, amount, status, provider, created_at)
         VALUES (?, ?, ?, ?, 'paid', 'test', ?)`,
      ).run(req.user.id, req.body.product, listingId, product.amount, stamp);
    });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ ok: true, testMode: true, user: userOut(user) });
  });

  // Returns one sponsor placement for a slot, or null when there is nothing to show.
  router.get('/ads', (req, res) => {
    const slot = String(req.query.slot || 'any');
    const ad = db
      .prepare(
        "SELECT id, title, body, cta, url FROM ads WHERE active = 1 AND slot IN (?, 'any') ORDER BY RANDOM() LIMIT 1",
      )
      .get(slot);
    if (ad) db.prepare('UPDATE ads SET impressions = impressions + 1 WHERE id = ?').run(ad.id);
    res.json({ ad: ad ?? null });
  });

  router.post('/ads/:id/click', (req, res) => {
    db.prepare('UPDATE ads SET clicks = clicks + 1 WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  const admin = [
    auth.required,
    (req, _res, next) => {
      if (!adminEmails.includes(req.user.email)) return next(new HttpError(403, 'Admins only'));
      next();
    },
  ];

  router.get('/admin/stats', admin, (_req, res) => {
    const count = (sql) => db.prepare(sql).get().n;
    res.json({
      users: count('SELECT COUNT(*) AS n FROM users'),
      activeListings: count("SELECT COUNT(*) AS n FROM listings WHERE status = 'active'"),
      completedTrades: count("SELECT COUNT(*) AS n FROM offers WHERE status = 'accepted'"),
      revenue: count("SELECT COALESCE(SUM(amount), 0) AS n FROM payments WHERE status = 'paid'"),
      ads: db.prepare('SELECT * FROM ads ORDER BY id').all(),
    });
  });

  router.post('/admin/ads', admin, (req, res) => {
    const title = text(req.body.title, 'Title', { min: 2, max: 80 });
    const body = text(req.body.body, 'Text', { max: 200 });
    const cta = text(req.body.cta || 'Learn more', 'Button label', { min: 2, max: 30 });
    const url = text(req.body.url, 'Link', { min: 1, max: 500 });
    if (!/^(https?:\/\/|\/)/.test(url)) throw new HttpError(400, 'Link must start with http://, https:// or /');
    const slot = text(req.body.slot || 'any', 'Slot', { min: 2, max: 30 });
    const { lastInsertRowid } = db
      .prepare('INSERT INTO ads (slot, title, body, cta, url, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(slot, title, body, cta, url, now());
    res.status(201).json({ ad: db.prepare('SELECT * FROM ads WHERE id = ?').get(lastInsertRowid) });
  });

  router.patch('/admin/ads/:id', admin, (req, res) => {
    db.prepare('UPDATE ads SET active = ? WHERE id = ?').run(req.body.active ? 1 : 0, Number(req.params.id));
    res.json({ ad: db.prepare('SELECT * FROM ads WHERE id = ?').get(Number(req.params.id)) ?? null });
  });

  return router;
}
