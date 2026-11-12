import { Router } from 'express';
import { tx } from '../db.js';
import { CURRENCY } from '../meta.js';
import { HttpError, LISTING_SELECT, int, listingOut, now, text } from '../util.js';

const MAX_CASH = 2_000_000_000;

const money = (n) => `${CURRENCY} ${Math.abs(n).toLocaleString('en-US')}`;

// Plain-language description of the cash part of an offer, from the offerer's side.
function cashLine(cash, offererName) {
  if (cash > 0) return `${offererName} adds ${money(cash)} on top`;
  if (cash < 0) return `${offererName} asks for ${money(cash)} on top`;
  return 'a straight swap with no cash';
}

function systemMessage(db, offerId, body, stamp) {
  db.prepare('INSERT INTO messages (offer_id, sender_id, body, created_at) VALUES (?, NULL, ?, ?)').run(
    offerId,
    body,
    stamp,
  );
}

// Declines every pending offer that involves any of the given listings, as the
// target or as an offered item. Used when an item is traded or removed.
export function closeOffersFor(db, listingIds, reason, exceptOfferId = 0) {
  const stamp = now();
  const marks = listingIds.map(() => '?').join(',');
  const open = db
    .prepare(
      `SELECT DISTINCT o.id FROM offers o LEFT JOIN offer_items i ON i.offer_id = o.id
       WHERE o.status = 'pending' AND o.id != ?
         AND (o.listing_id IN (${marks}) OR i.listing_id IN (${marks}))`,
    )
    .all(exceptOfferId, ...listingIds, ...listingIds);
  for (const { id } of open) {
    db.prepare("UPDATE offers SET status = 'declined', updated_at = ? WHERE id = ?").run(stamp, id);
    systemMessage(db, id, reason, stamp);
  }
}

export function offerRoutes({ db, auth }) {
  const router = Router();

  const OFFER_SELECT = `
    SELECT o.*, f.name AS from_name, t.name AS to_name
    FROM offers o JOIN users f ON f.id = o.from_user_id JOIN users t ON t.id = o.to_user_id`;

  function offerOut(row, viewerId, full = false) {
    const listing = db.prepare(`${LISTING_SELECT} WHERE l.id = ?`).get(row.listing_id);
    const items = db
      .prepare(
        `${LISTING_SELECT} JOIN offer_items i ON i.listing_id = l.id WHERE i.offer_id = ? ORDER BY l.id`,
      )
      .all(row.id);
    const out = {
      id: row.id,
      listing: listingOut(listing),
      items: items.map(listingOut),
      cash: row.cash,
      status: row.status,
      from: { id: row.from_user_id, name: row.from_name },
      to: { id: row.to_user_id, name: row.to_name },
      role: viewerId === row.from_user_id ? 'offerer' : 'owner',
      yourTurn: row.status === 'pending' && row.awaiting_user_id === viewerId,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    if (full) {
      out.messages = db
        .prepare('SELECT id, sender_id AS senderId, body, created_at AS createdAt FROM messages WHERE offer_id = ? ORDER BY id')
        .all(row.id);
      // Contact details are only shared once both sides have agreed to the trade.
      if (row.status === 'accepted') {
        const otherId = viewerId === row.from_user_id ? row.to_user_id : row.from_user_id;
        const other = db.prepare('SELECT name, email, phone, city FROM users WHERE id = ?').get(otherId);
        out.contact = { name: other.name, email: other.email, phone: other.phone, city: other.city };
      }
    }
    return out;
  }

  function loadOffer(req) {
    const row = db.prepare(`${OFFER_SELECT} WHERE o.id = ?`).get(Number(req.params.id));
    if (!row || (row.from_user_id !== req.user.id && row.to_user_id !== req.user.id)) {
      throw new HttpError(404, 'Trade offer not found');
    }
    return row;
  }

  const reload = (id, viewerId) =>
    offerOut(db.prepare(`${OFFER_SELECT} WHERE o.id = ?`).get(id), viewerId, true);

  router.get('/offers', auth.required, (req, res) => {
    const rows = db
      .prepare(`${OFFER_SELECT} WHERE o.from_user_id = ? OR o.to_user_id = ? ORDER BY o.updated_at DESC, o.id DESC`)
      .all(req.user.id, req.user.id);
    res.json({ offers: rows.map((row) => offerOut(row, req.user.id)) });
  });

  router.post('/offers', auth.required, (req, res) => {
    const listingId = int(req.body.listingId, 'Item', { min: 1, max: Number.MAX_SAFE_INTEGER });
    const cash = int(req.body.cash ?? 0, 'Cash amount', { min: -MAX_CASH, max: MAX_CASH });
    const message = text(req.body.message, 'Message', { max: 1000 });
    const itemIds = Array.isArray(req.body.itemIds) ? [...new Set(req.body.itemIds.map(Number))] : [];
    if (itemIds.length === 0) throw new HttpError(400, 'Pick at least one of your items to offer in trade');
    if (itemIds.length > 10) throw new HttpError(400, 'You can offer up to 10 items in one trade');

    const offer = tx(db, () => {
      const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId);
      if (!listing || listing.status !== 'active') throw new HttpError(404, 'This item is no longer available');
      if (listing.user_id === req.user.id) throw new HttpError(400, 'You cannot make an offer on your own item');
      for (const id of itemIds) {
        const item = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
        if (!item || item.user_id !== req.user.id || item.status !== 'active') {
          throw new HttpError(400, 'You can only offer your own active items');
        }
      }
      const existing = db
        .prepare("SELECT id FROM offers WHERE listing_id = ? AND from_user_id = ? AND status = 'pending'")
        .get(listingId, req.user.id);
      if (existing) throw new HttpError(409, 'You already have an open offer on this item');

      const stamp = now();
      const { lastInsertRowid: id } = db
        .prepare(
          `INSERT INTO offers (listing_id, from_user_id, to_user_id, cash, awaiting_user_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(listingId, req.user.id, listing.user_id, cash, listing.user_id, stamp, stamp);
      for (const itemId of itemIds) {
        db.prepare('INSERT INTO offer_items (offer_id, listing_id) VALUES (?, ?)').run(id, itemId);
      }
      systemMessage(db, id, `${req.user.name} sent a trade offer: ${cashLine(cash, req.user.name)}.`, stamp);
      if (message) {
        db.prepare('INSERT INTO messages (offer_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)').run(
          id,
          req.user.id,
          message,
          stamp,
        );
      }
      return id;
    });
    res.status(201).json({ offer: reload(offer, req.user.id) });
  });

  router.get('/offers/:id', auth.required, (req, res) => {
    res.json({ offer: offerOut(loadOffer(req), req.user.id, true) });
  });

  router.post('/offers/:id/messages', auth.required, (req, res) => {
    const row = loadOffer(req);
    const body = text(req.body.body, 'Message', { min: 1, max: 1000 });
    db.prepare('INSERT INTO messages (offer_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)').run(
      row.id,
      req.user.id,
      body,
      now(),
    );
    res.status(201).json({ offer: reload(row.id, req.user.id) });
  });

  // Whoever's turn it is can change the cash amount and hand the offer back.
  router.post('/offers/:id/counter', auth.required, (req, res) => {
    const cash = int(req.body.cash, 'Cash amount', { min: -MAX_CASH, max: MAX_CASH });
    const id = tx(db, () => {
      const row = loadOffer(req);
      if (row.status !== 'pending') throw new HttpError(409, 'This offer is no longer open');
      if (row.awaiting_user_id !== req.user.id) throw new HttpError(409, 'Waiting for the other person to respond');
      if (cash === row.cash) throw new HttpError(400, 'Change the cash amount to make a counter-offer');
      const other = row.from_user_id === req.user.id ? row.to_user_id : row.from_user_id;
      const stamp = now();
      db.prepare('UPDATE offers SET cash = ?, awaiting_user_id = ?, updated_at = ? WHERE id = ?').run(
        cash,
        other,
        stamp,
        row.id,
      );
      systemMessage(db, row.id, `${req.user.name} made a counter-offer: ${cashLine(cash, row.from_name)}.`, stamp);
      return row.id;
    });
    res.json({ offer: reload(id, req.user.id) });
  });

  router.post('/offers/:id/accept', auth.required, (req, res) => {
    const id = tx(db, () => {
      const row = loadOffer(req);
      if (row.status !== 'pending') throw new HttpError(409, 'This offer is no longer open');
      if (row.awaiting_user_id !== req.user.id) throw new HttpError(409, 'Waiting for the other person to respond');
      const itemIds = db.prepare('SELECT listing_id FROM offer_items WHERE offer_id = ?').all(row.id);
      const listingIds = [row.listing_id, ...itemIds.map((i) => i.listing_id)];
      for (const listingId of listingIds) {
        const listing = db.prepare('SELECT status FROM listings WHERE id = ?').get(listingId);
        if (listing.status !== 'active') throw new HttpError(409, 'One of the items in this trade is no longer available');
      }
      const stamp = now();
      db.prepare("UPDATE offers SET status = 'accepted', updated_at = ? WHERE id = ?").run(stamp, row.id);
      for (const listingId of listingIds) {
        db.prepare("UPDATE listings SET status = 'traded' WHERE id = ?").run(listingId);
      }
      systemMessage(
        db,
        row.id,
        `${req.user.name} accepted the trade. Your contact details are now shared so you can arrange the swap.`,
        stamp,
      );
      closeOffersFor(db, listingIds, 'This offer was closed because one of the items was traded to someone else.', row.id);
      return row.id;
    });
    res.json({ offer: reload(id, req.user.id) });
  });

  router.post('/offers/:id/decline', auth.required, (req, res) => {
    const row = loadOffer(req);
    if (row.status !== 'pending') throw new HttpError(409, 'This offer is no longer open');
    if (row.awaiting_user_id !== req.user.id) throw new HttpError(409, 'Waiting for the other person to respond');
    const stamp = now();
    db.prepare("UPDATE offers SET status = 'declined', updated_at = ? WHERE id = ?").run(stamp, row.id);
    systemMessage(db, row.id, `${req.user.name} declined the offer.`, stamp);
    res.json({ offer: reload(row.id, req.user.id) });
  });

  router.post('/offers/:id/cancel', auth.required, (req, res) => {
    const row = loadOffer(req);
    if (row.status !== 'pending') throw new HttpError(409, 'This offer is no longer open');
    if (row.from_user_id !== req.user.id) throw new HttpError(403, 'Only the person who made the offer can cancel it');
    const stamp = now();
    db.prepare("UPDATE offers SET status = 'cancelled', updated_at = ? WHERE id = ?").run(stamp, row.id);
    systemMessage(db, row.id, `${req.user.name} cancelled the offer.`, stamp);
    res.json({ offer: reload(row.id, req.user.id) });
  });

  return router;
}
