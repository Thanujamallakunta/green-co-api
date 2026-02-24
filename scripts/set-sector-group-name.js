/**
 * Set group_name on a sector so "GROUP" shows in the API (resources-center, quickview).
 * GROUP and SECTOR come from the company's sector: group_name → GROUP, name → SECTOR.
 *
 * Usage:
 *   node scripts/set-sector-group-name.js <sectorId> <group_name>
 *
 * To find sectorId: run "node scripts/set-company-sector.js 6994af7e1c64cedc200bd8c8" (company id only) to list sectors.
 * Or use the sector _id that has name "Automotive" (or your sector).
 *
 * Example (sector has name "Automotive", set group to "Automotive"):
 *   node scripts/set-sector-group-name.js 674a1234567890abcdef1234 Automotive
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const sectorId = process.argv[2];
const groupName = process.argv[3];

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco_db';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco_db');
  }
}

async function run() {
  if (!sectorId || groupName === undefined) {
    console.error('Usage: node scripts/set-sector-group-name.js <sectorId> <group_name>');
    console.error('Example: node scripts/set-sector-group-name.js 674a1234567890abcdef1234 Automotive');
    console.error('');
    console.error('To list sectors (get _id): node scripts/set-company-sector.js <companyId>');
    process.exit(1);
  }

  let id;
  try {
    id = new ObjectId(sectorId);
  } catch (_) {
    console.error('Invalid sectorId:', sectorId);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('sectors');

  const sector = await coll.findOne({ _id: id });
  if (!sector) {
    console.error('Sector not found:', sectorId);
    process.exit(1);
  }

  await coll.updateOne(
    { _id: id },
    { $set: { group_name: groupName, updatedAt: new Date() } },
  );

  console.log('Updated sector', sectorId);
  console.log('  name:', sector.name);
  console.log('  group_name:', groupName);
  console.log('');
  console.log('GET resources-center and quickview will now return data.group = "' + groupName + '"');
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
