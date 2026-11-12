import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

let server;
let base;
const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tradehub-test-'));

before(async () => {
  const app = createApp({ db: openDb(':memory:'), jwtSecret: 'test', uploadsDir, rateLimits: false, adminEmails: ['admin@example.com'] });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.close();
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

async function signUp(name) {
  const { body } = await call('POST', '/auth/register', {
    name,
    email: `${name.toLowerCase()}@example.com`,
    password: 'password123',
    city: 'Lahore',
    phone: '0300 0000000',
    acceptTerms: true,
  });
  return body.token;
}

async function list(token, title, value, extra = {}) {
  const { status, body } = await call(
    'POST',
    '/listings',
    { title, value, category: 'phones', condition: 'good', city: 'Lahore', ...extra },
    token,
  );
  assert.equal(status, 201);
  return body.listing;
}

// 1x1 transparent PNG
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('trade with a cash top-up: offer, counter, accept', async () => {
  const seller = await signUp('Seller');
  const buyer = await signUp('Buyer');
  const rival = await signUp('Rival');

  const target = await list(seller, 'iPhone 16 Pro Max', 520000, { images: [PIXEL] });
  assert.match(target.images[0], /^\/uploads\/.+\.png$/);
  const mine = await list(buyer, 'iPhone 14 Pro Max', 310000);
  const rivalItem = await list(rival, 'Galaxy S24 Ultra', 365000);

  // Validation
  assert.equal((await call('POST', '/offers', { listingId: target.id, itemIds: [] }, buyer)).status, 400);
  assert.equal((await call('POST', '/offers', { listingId: target.id, itemIds: [mine.id] }, seller)).status, 400);
  assert.equal((await call('POST', '/offers', { listingId: target.id, itemIds: [rivalItem.id] }, buyer)).status, 400);
  assert.equal((await call('POST', '/offers', { listingId: target.id, itemIds: [mine.id] })).status, 401);

  const made = await call('POST', '/offers', { listingId: target.id, itemIds: [mine.id], cash: 150000, message: 'Deal?' }, buyer);
  assert.equal(made.status, 201);
  const id = made.body.offer.id;
  assert.equal(made.body.offer.yourTurn, false);
  assert.equal(made.body.offer.messages.length, 2);

  assert.equal((await call('POST', '/offers', { listingId: target.id, itemIds: [mine.id] }, buyer)).status, 409);
  const rivalOffer = await call('POST', '/offers', { listingId: target.id, itemIds: [rivalItem.id], cash: 100000 }, rival);
  assert.equal(rivalOffer.status, 201);

  // Other people cannot see the offer, and the offerer cannot accept their own offer.
  assert.equal((await call('GET', `/offers/${id}`, null, rival)).status, 404);
  assert.equal((await call('POST', `/offers/${id}/accept`, null, buyer)).status, 409);

  // Seller counters with a higher top-up; now it is the buyer's turn.
  const countered = await call('POST', `/offers/${id}/counter`, { cash: 200000 }, seller);
  assert.equal(countered.body.offer.cash, 200000);
  assert.equal(countered.body.offer.yourTurn, false);
  assert.equal((await call('GET', '/me', null, buyer)).body.user.actionNeeded, 1);
  assert.equal((await call('POST', `/offers/${id}/accept`, null, seller)).status, 409);

  const before = await call('GET', `/offers/${id}`, null, buyer);
  assert.equal(before.body.offer.contact, undefined);

  const accepted = await call('POST', `/offers/${id}/accept`, null, buyer);
  assert.equal(accepted.body.offer.status, 'accepted');
  assert.equal(accepted.body.offer.contact.name, 'Seller');
  assert.equal(accepted.body.offer.listing.status, 'traded');
  assert.equal(accepted.body.offer.items[0].status, 'traded');

  // The rival's offer on the same item is closed and traded items leave the feed.
  const closed = await call('GET', `/offers/${rivalOffer.body.offer.id}`, null, rival);
  assert.equal(closed.body.offer.status, 'declined');
  const feed = await call('GET', '/listings');
  assert.deepEqual(feed.body.listings.map((l) => l.id), [rivalItem.id]);
});

test('removing an item closes its open offers', async () => {
  const a = await signUp('Anna');
  const b = await signUp('Ben');
  const item = await list(a, 'Sony TV', 185000);
  const swap = await list(b, 'PlayStation 5', 165000);
  const { body } = await call('POST', '/offers', { listingId: item.id, itemIds: [swap.id], cash: 20000 }, b);
  assert.equal((await call('DELETE', `/listings/${swap.id}`, null, a)).status, 404);
  assert.equal((await call('DELETE', `/listings/${swap.id}`, null, b)).status, 200);
  assert.equal((await call('GET', `/offers/${body.offer.id}`, null, a)).body.offer.status, 'declined');
  assert.equal((await call('GET', `/listings/${swap.id}`)).status, 404);
});

test('boosts feature a listing and premium lifts the listing limit', async () => {
  const token = await signUp('Paula');
  const first = await list(token, 'Item 0', 1000);
  for (let i = 1; i < 10; i++) await list(token, `Item ${i}`, 1000);
  const blocked = await call('POST', '/listings', { title: 'Item 10', value: 1000, category: 'other', condition: 'good', city: 'Lahore' }, token);
  assert.equal(blocked.status, 403);

  const premium = await call('POST', '/checkout', { product: 'premium_30' }, token);
  assert.equal(premium.body.user.premium, true);
  await list(token, 'Item 10', 1000);

  assert.equal((await call('POST', '/checkout', { product: 'boost_7', listingId: 999999 }, token)).status, 400);
  assert.equal((await call('POST', '/checkout', { product: 'boost_7', listingId: first.id }, token)).status, 200);
  const feed = await call('GET', '/listings?user=' + first.owner.id);
  assert.equal(feed.body.listings[0].id, first.id);
  assert.equal(feed.body.listings[0].featured, true);
});

test('ads are served and admin routes are protected', async () => {
  const token = await signUp('Nadia');
  assert.equal((await call('GET', '/ads?slot=home')).body.ad, null);
  assert.equal((await call('GET', '/admin/stats', null, token)).status, 403);
  assert.equal((await call('GET', '/nope')).status, 404);
});

test('sign-up needs consent, logins are checked, and accounts can be deleted', async () => {
  const form = { name: 'Zed', email: 'zed@example.com', password: 'password123', city: 'Lahore', phone: '' };
  assert.equal((await call('POST', '/auth/register', form)).status, 400);
  assert.equal((await call('POST', '/auth/register', { ...form, acceptTerms: true, password: 'short' })).status, 400);
  const token = await signUp('Zed');
  assert.equal((await call('POST', '/auth/register', { ...form, acceptTerms: true })).status, 409);
  assert.equal((await call('POST', '/auth/login', { email: form.email, password: 'wrong-password' })).status, 401);
  assert.equal((await call('POST', '/auth/login', { email: form.email, password: form.password })).status, 200);

  const item = await list(token, 'Old laptop', 50000);
  assert.equal((await call('DELETE', '/me', { password: 'nope' }, token)).status, 403);
  assert.equal((await call('DELETE', '/me', { password: form.password }, token)).status, 200);
  assert.equal((await call('GET', '/me', null, token)).status, 401);
  assert.equal((await call('POST', '/auth/login', { email: form.email, password: form.password })).status, 401);
  assert.equal((await call('GET', `/listings/${item.id}`)).status, 404);
});

test('fake images are rejected', async () => {
  const token = await signUp('Faker');
  const fake = 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');
  const res = await call(
    'POST',
    '/listings',
    { title: 'Bad upload', value: 10, category: 'other', condition: 'good', city: 'Lahore', images: [fake] },
    token,
  );
  assert.equal(res.status, 400);
});

test('reported items can be taken down by an admin', async () => {
  const owner = await signUp('Owner');
  const reporter = await signUp('Reporter');
  const admin = await signUp('Admin');
  const item = await list(owner, 'Suspicious item', 1000);
  const report = (body, token) => call('POST', `/listings/${item.id}/report`, body, token);
  assert.equal((await report({ reason: 'scam' })).status, 401);
  assert.equal((await report({ reason: 'scam' }, owner)).status, 400);
  assert.equal((await report({ reason: 'nonsense' }, reporter)).status, 400);
  assert.equal((await report({ reason: 'scam', details: 'Asks for advance payment' }, reporter)).status, 201);
  assert.equal((await call('GET', '/admin/reports', null, reporter)).status, 403);
  const { body } = await call('GET', '/admin/reports', null, admin);
  const found = body.reports.find((r) => r.listingId === item.id);
  assert.equal(found.reason, 'scam');
  assert.equal((await call('POST', `/admin/reports/${found.id}/resolve`, { remove: true }, admin)).status, 200);
  assert.equal((await call('GET', `/listings/${item.id}`)).status, 404);
});

test('responses carry security headers', async () => {
  const res = await fetch(base + '/health');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.ok(res.headers.get('strict-transport-security'));
  assert.equal(res.headers.get('x-powered-by'), null);
});
