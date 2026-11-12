import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  premium_until TEXT,
  terms_accepted_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  value INTEGER NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  wants TEXT NOT NULL DEFAULT '',
  images TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  featured_until TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS listings_status ON listings(status, created_at);
CREATE INDEX IF NOT EXISTS listings_user ON listings(user_id);

-- cash is what the offerer pays the listing owner on top of their items.
-- A negative value means the offerer is asking the owner to add cash instead.
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  from_user_id INTEGER NOT NULL REFERENCES users(id),
  to_user_id INTEGER NOT NULL REFERENCES users(id),
  cash INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  awaiting_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS offers_from ON offers(from_user_id);
CREATE INDEX IF NOT EXISTS offers_to ON offers(to_user_id);
CREATE INDEX IF NOT EXISTS offers_listing ON offers(listing_id);

CREATE TABLE IF NOT EXISTS offer_items (
  offer_id INTEGER NOT NULL REFERENCES offers(id),
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  PRIMARY KEY (offer_id, listing_id)
);

-- sender_id is NULL for system messages (offer sent, countered, accepted...).
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  offer_id INTEGER NOT NULL REFERENCES offers(id),
  sender_id INTEGER REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_offer ON messages(offer_id, id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product TEXT NOT NULL,
  listing_id INTEGER REFERENCES listings(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Items flagged by users for the moderators to review.
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  UNIQUE (listing_id, reporter_id)
);

-- Directly sold sponsor placements, shown in the app's ad slots.
CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY,
  slot TEXT NOT NULL DEFAULT 'any',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT 'Learn more',
  url TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`;

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
