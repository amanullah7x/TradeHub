import { Router } from 'express';
import { tx } from '../db.js';
import { HttpError, now, oneOf, text } from '../util.js';
import { closeOffersFor } from './offers.js';

export const REPORT_REASONS = ['prohibited', 'counterfeit', 'stolen', 'scam', 'copyright', 'offensive', 'other'];

export function moderationRoutes({ db, auth, adminEmails }) {
  const router = Router();

  router.post('/listings/:id/report', auth.required, (req, res) => {
    const reason = oneOf(req.body.reason, 'Reason', REPORT_REASONS);
    const details = text(req.body.details, 'Details', { max: 1000 });
    const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(Number(req.params.id));
    if (!listing || listing.status === 'removed') throw new HttpError(404, 'This item is no longer available');
    if (listing.user_id === req.user.id) throw new HttpError(400, 'You cannot report your own item');
    // One report per person per item; reporting again updates it.
    db.prepare(
      `INSERT INTO reports (listing_id, reporter_id, reason, details, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (listing_id, reporter_id) DO UPDATE SET reason = excluded.reason, details = excluded.details`,
    ).run(listing.id, req.user.id, reason, details, now());
    res.status(201).json({ ok: true });
  });

  const admin = [
    auth.required,
    (req, _res, next) => {
      if (!adminEmails.includes(req.user.email)) return next(new HttpError(403, 'Admins only'));
      next();
    },
  ];

  router.get('/admin/reports', admin, (_req, res) => {
    const reports = db
      .prepare(
        `SELECT r.id, r.reason, r.details, r.status, r.created_at AS createdAt,
                l.id AS listingId, l.title AS listingTitle, l.status AS listingStatus,
                u.email AS reporterEmail
         FROM reports r JOIN listings l ON l.id = r.listing_id JOIN users u ON u.id = r.reporter_id
         ORDER BY r.status = 'open' DESC, r.id DESC LIMIT 200`,
      )
      .all();
    res.json({ reports });
  });

  // Resolves a report. With { remove: true } the reported item is taken down as well.
  router.post('/admin/reports/:id/resolve', admin, (req, res) => {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(Number(req.params.id));
    if (!report) throw new HttpError(404, 'Report not found');
    tx(db, () => {
      if (req.body.remove) {
        db.prepare("UPDATE listings SET status = 'removed' WHERE id = ? AND status = 'active'").run(report.listing_id);
        closeOffersFor(db, [report.listing_id], 'This offer was closed because an item was removed by TradeHub.');
        db.prepare("UPDATE reports SET status = 'resolved' WHERE listing_id = ?").run(report.listing_id);
      } else {
        db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(report.id);
      }
    });
    res.json({ ok: true });
  });

  return router;
}
