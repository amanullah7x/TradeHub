import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { openDb, tx } from './db.js';
import { addDays, now } from './util.js';

const USERS = [
  { name: 'Ali Raza', email: 'ali@tradehub.test', city: 'Lahore', phone: '0300 1234567' },
  { name: 'Sara Khan', email: 'sara@tradehub.test', city: 'Karachi', phone: '0321 7654321' },
  { name: 'Bilal Ahmed', email: 'bilal@tradehub.test', city: 'Islamabad', phone: '0333 5550101' },
];

// [owner index, title, category, condition, value, wants, description, featured]
const LISTINGS = [
  [1, 'iPhone 16 Pro Max 256GB, Natural Titanium', 'phones', 'like_new', 520000, 'iPhone 14 Pro Max or 15 Pro plus cash', 'PTA approved, 3 months used, box and cable included. Battery health 100%.', true],
  [0, 'iPhone 14 Pro Max 256GB, Deep Purple', 'phones', 'good', 310000, 'Newer iPhone, happy to add cash', 'PTA approved, battery health 88%. Minor scratches on the frame, screen is spotless.', false],
  [2, 'Samsung Galaxy S24 Ultra 12/256', 'phones', 'like_new', 365000, 'iPhone 15 Pro Max or a gaming laptop', 'Official PTA, with S Pen, box and original charger.', false],
  [2, 'Honda Civic Oriel 2019, 62,000 km', 'cars', 'good', 6200000, 'Toyota Fortuner or Kia Sportage, cash adjusted either way', 'First owner, Islamabad registered, complete service history from the dealership.', true],
  [1, 'Suzuki Alto VXL AGS 2022', 'cars', 'like_new', 2950000, 'Honda City or Toyota Yaris', 'Only 21,000 km driven. Karachi registered, bumper to bumper original.', false],
  [0, 'Honda CB150F 2023', 'bikes', 'like_new', 420000, 'Yamaha YBR 125G plus cash, or a good laptop', '6,500 km, all documents clear, first owner.', false],
  [0, 'Sony Bravia 55" 4K Google TV', 'tvs', 'good', 185000, 'PlayStation 5 or a 65" TV with cash from my side', 'X80K series, two years old, wall mount included.', false],
  [1, 'Samsung 65" Crystal UHD Smart TV', 'tvs', 'like_new', 240000, 'iPad Pro or MacBook Air', 'Bought six months ago, in warranty, with box.', false],
  [2, 'Apple AirPods Pro 2 (USB-C)', 'audio', 'new', 62000, 'Sony WH-1000XM5 or a smartwatch', 'Sealed box, bought from abroad.', false],
  [0, 'Sony WH-1000XM5 headphones', 'audio', 'good', 78000, 'AirPods Pro 2 or Bose QC earbuds', 'Excellent noise cancelling, with case and cable.', false],
  [1, 'MacBook Air M2 13" 8/256', 'computers', 'good', 265000, 'Windows gaming laptop or iPhone 15 Pro', 'Battery cycle count 140, Midnight colour, with charger.', true],
  [2, 'Dell G15 Gaming Laptop, RTX 4060', 'computers', 'like_new', 340000, 'MacBook Pro M-series', 'i7 13th gen, 16GB RAM, 512GB SSD. Six months old.', false],
  [0, 'PlayStation 5 Slim with 2 controllers', 'gaming', 'like_new', 165000, 'Xbox Series X or Nintendo Switch OLED plus cash', 'Disc edition with FC 25 and Spider-Man 2.', false],
  [1, 'Haier 1.5 Ton DC Inverter AC', 'appliances', 'good', 135000, 'Fridge or automatic washing machine', 'Two seasons used, cooling is perfect, with outdoor stand.', false],
  [2, '5-seater L-shaped sofa set', 'furniture', 'good', 90000, 'Dining table or a study desk setup', 'Grey fabric, very comfortable, moving out so needs to go.', false],
  [1, 'Apple Watch Series 9 45mm', 'fashion', 'like_new', 98000, 'Samsung Galaxy Watch 6 Classic plus cash', 'Midnight aluminium, with two extra straps.', false],
];

const ADS = [
  ['any', 'Advertise on TradeHub', 'Put your shop in front of thousands of people looking to trade.', 'Get in touch', '/premium'],
  ['any', 'Trade without the ads', 'Premium members get an ad-free TradeHub and unlimited listings.', 'Go Premium', '/premium'],
];

// Fills an empty database with demo accounts, items and one sample offer.
// Returns false (and does nothing) if the database already has users.
export async function seedDemoData(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) return false;
  const hash = await bcrypt.hash('tradehub123', 10);
  tx(db, () => {
    const stamp = now();
    const userIds = USERS.map(
      (u) =>
        db
          .prepare('INSERT INTO users (name, email, password_hash, city, phone, terms_accepted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(u.name, u.email, hash, u.city, u.phone, stamp, stamp).lastInsertRowid,
    );
    const listingIds = LISTINGS.map(([owner, title, category, condition, value, wants, description, featured], i) => {
      // Spread creation times out so the newest-first order looks natural.
      const created = new Date(Date.now() - (LISTINGS.length - i) * 3600_000).toISOString();
      return db
        .prepare(
          `INSERT INTO listings (user_id, title, description, category, condition, value, city, wants, featured_until, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(userIds[owner], title, description, category, condition, value, USERS[owner].city, wants, featured ? addDays(stamp, 30) : null, created)
        .lastInsertRowid;
    });
    for (const [slot, title, body, cta, url] of ADS) {
      db.prepare('INSERT INTO ads (slot, title, body, cta, url, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(slot, title, body, cta, url, stamp);
    }
    // Ali offers his iPhone 14 Pro Max plus cash for Sara's iPhone 16 Pro Max.
    const offerId = db
      .prepare(
        `INSERT INTO offers (listing_id, from_user_id, to_user_id, cash, awaiting_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(listingIds[0], userIds[0], userIds[1], 200000, userIds[1], stamp, stamp).lastInsertRowid;
    db.prepare('INSERT INTO offer_items (offer_id, listing_id) VALUES (?, ?)').run(offerId, listingIds[1]);
    db.prepare('INSERT INTO messages (offer_id, sender_id, body, created_at) VALUES (?, NULL, ?, ?)').run(
      offerId,
      'Ali Raza sent a trade offer: Ali Raza adds Rs 200,000 on top.',
      stamp,
    );
    db.prepare('INSERT INTO messages (offer_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)').run(
      offerId,
      userIds[0],
      'Salam! My 14 Pro Max is in great shape. Would you swap for it plus 200k?',
      stamp,
    );
  });
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const seeded = await seedDemoData(openDb(config.dbFile));
  console.log(seeded ? 'Demo data added.' : 'Database already has data, nothing changed.');
}
