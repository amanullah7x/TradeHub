import { createApp } from './app.js';
import { config } from './config.js';
import { openDb } from './db.js';
import { seedDemoData } from './seed.js';

const db = openDb(config.dbFile);

// A fresh local database starts with demo items so there is something to look at.
if (!config.production && process.env.SEED_DEMO !== '0') {
  if (await seedDemoData(db)) console.log('Seeded demo data (sign in as ali@tradehub.test / tradehub123)');
}

createApp({ db, ...config }).listen(config.port, () => {
  console.log(`TradeHub API listening on http://localhost:${config.port}`);
});
