import { Router } from 'express';
import crypto from 'node:crypto';
import { tx } from '../db.js';
import { closeOffersFor } from './offers.js';
import bcrypt from 'bcryptjs';
import { HttpError, now, text, userOut } from '../util.js';

const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), 10);

export function authRoutes({ db, auth }) {
  const router = Router();

  const actionNeeded = (userId) =>
    db
      .prepare("SELECT COUNT(*) AS n FROM offers WHERE status = 'pending' AND awaiting_user_id = ?")
      .get(userId).n;

  const session = (user) => ({
    token: auth.sign(user.id),
    user: { ...userOut(user), actionNeeded: actionNeeded(user.id) },
  });

  router.post('/auth/register', async (req, res) => {
    const name = text(req.body.name, 'Name', { min: 2, max: 60 });
    const email = text(req.body.email, 'Email', { min: 5, max: 120 }).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const city = text(req.body.city, 'City', { max: 60 });
    const phone = text(req.body.phone, 'Phone', { max: 30 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address');
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    if (password.length > 200) throw new HttpError(400, 'Password is too long');
    if (req.body.acceptTerms !== true) {
      throw new HttpError(400, 'Please agree to the Terms of Use and Privacy Policy to create an account');
    }
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    const hash = await bcrypt.hash(password, 10);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (name, email, password_hash, city, phone, terms_accepted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name, email, hash, city, phone, now(), now());
    res.status(201).json(session(db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid)));
  });

  router.post('/auth/login', async (req, res) => {
    const email = text(req.body.email, 'Email', { min: 1, max: 120 }).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Always run a hash comparison so the response time does not reveal whether the email exists.
    const matches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || user.deleted_at || !matches) {
      throw new HttpError(401, 'Wrong email or password');
    }
    res.json(session(user));
  });

  router.get('/me', auth.required, (req, res) => {
    res.json({ user: { ...userOut(req.user), actionNeeded: actionNeeded(req.user.id) } });
  });

  router.patch('/me', auth.required, (req, res) => {
    const name = text(req.body.name ?? req.user.name, 'Name', { min: 2, max: 60 });
    const city = text(req.body.city ?? req.user.city, 'City', { max: 60 });
    const phone = text(req.body.phone ?? req.user.phone, 'Phone', { max: 30 });
    db.prepare('UPDATE users SET name = ?, city = ?, phone = ? WHERE id = ?').run(name, city, phone, req.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: { ...userOut(user), actionNeeded: actionNeeded(user.id) } });
  });

  // Erases the account: items come down, open offers close and personal details are wiped.
  // The row itself stays so past trades and messages still make sense to the other person.
  router.delete('/me', auth.required, async (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!(await bcrypt.compare(password, req.user.password_hash))) throw new HttpError(403, 'Wrong password');
    tx(db, () => {
      const ids = db
        .prepare("SELECT id FROM listings WHERE user_id = ? AND status = 'active'")
        .all(req.user.id)
        .map((l) => l.id);
      if (ids.length) closeOffersFor(db, ids, 'This offer was closed because an item was removed.');
      db.prepare("UPDATE listings SET status = 'removed' WHERE user_id = ? AND status = 'active'").run(req.user.id);
      const stamp = now();
      db.prepare(
        "UPDATE offers SET status = 'cancelled', updated_at = ? WHERE status = 'pending' AND (from_user_id = ? OR to_user_id = ?)",
      ).run(stamp, req.user.id, req.user.id);
      db.prepare(
        "UPDATE users SET name = 'Deleted user', email = ?, password_hash = ?, city = '', phone = '', premium_until = NULL, deleted_at = ? WHERE id = ?",
      ).run(`deleted-${req.user.id}-${crypto.randomUUID()}@deleted.invalid`, crypto.randomUUID(), stamp, req.user.id);
    });
    res.json({ ok: true });
  });

  return router;
}
