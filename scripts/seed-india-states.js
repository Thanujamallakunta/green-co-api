/**
 * Seed India States + Union Territories into `states` collection.
 *
 * Usage:
 *   node scripts/seed-india-states.js
 *
 * Notes:
 * - Upserts by `name` (keeps existing _id).
 * - Sets { status: 1 } and updates `code`.
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco');
  }
}

const INDIA_STATES_AND_UTS = [
  // States
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Assam', code: 'AS' },
  { name: 'Bihar', code: 'BR' },
  { name: 'Chhattisgarh', code: 'CG' },
  { name: 'Goa', code: 'GA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Odisha', code: 'OD' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Telangana', code: 'TS' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Uttarakhand', code: 'UK' },
  { name: 'West Bengal', code: 'WB' },

  // Union Territories
  { name: 'Andaman and Nicobar Islands', code: 'AN' },
  { name: 'Chandigarh', code: 'CH' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH' },
  { name: 'Delhi', code: 'DL' },
  { name: 'Jammu and Kashmir', code: 'JK' },
  { name: 'Ladakh', code: 'LA' },
  { name: 'Lakshadweep', code: 'LD' },
  { name: 'Puducherry', code: 'PY' },
];

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);

  // Mongoose model is `State` → collection is typically `states`
  // (If your DB uses a different collection name, change it here.)
  const statesColl = db.collection('states');

  const ops = INDIA_STATES_AND_UTS.map((s) => ({
    updateOne: {
      filter: { name: s.name },
      update: { $set: { name: s.name, code: s.code, status: 1 } },
      upsert: true,
    },
  }));

  const result = await statesColl.bulkWrite(ops, { ordered: false });
  console.log('Seeded India states/UTs into `states`.');
  console.log('Matched:', result.matchedCount, 'Modified:', result.modifiedCount, 'Upserted:', result.upsertedCount);

  const count = await statesColl.countDocuments({});
  console.log('Total docs in `states`:', count);

  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

