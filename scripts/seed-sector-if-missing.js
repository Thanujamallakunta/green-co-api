/**
 * Insert one sector (Auto / Auto) if the sectors collection is empty.
 * If companyId is passed, also set that company's sector to it (so Group/Sector show in API).
 *
 * Usage:
 *   node scripts/seed-sector-if-missing.js
 *   node scripts/seed-sector-if-missing.js <companyId>
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const companyId = process.argv[2];

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
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const sectorsColl = db.collection('sectors');
  const companiesColl = db.collection('companies');

  let sectorId;
  const count = await sectorsColl.countDocuments();
  if (count > 0) {
    const one = await sectorsColl.findOne({}, { projection: { _id: 1, name: 1, group_name: 1 } });
    sectorId = one._id;
    console.log('Sectors already exist. Using sector _id =', sectorId, ' name =', one.name, ' group_name =', one.group_name);
  } else {
    const result = await sectorsColl.insertOne({ name: 'Auto', group_name: 'Auto' });
    sectorId = result.insertedId;
    console.log('Inserted one sector: _id =', sectorId, ' name = Auto, group_name = Auto');
  }

  if (companyId) {
    try {
      const cId = new ObjectId(companyId);
      const company = await companiesColl.findOne({ _id: cId });
      if (!company) {
        console.error('Company not found:', companyId);
        process.exit(1);
      }
      await companiesColl.updateOne({ _id: cId }, { $set: { mst_sector_id: sectorId } });
      console.log('Set company', companyId, '-> sector', sectorId.toString(), '(Group/Sector will show in API).');
    } catch (e) {
      console.error('Invalid companyId or error:', e.message);
      process.exit(1);
    }
  } else if (count === 0) {
    console.log('');
    console.log('To set a company to this sector, run:');
    console.log('  node scripts/seed-sector-if-missing.js <companyId>');
  }

  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
