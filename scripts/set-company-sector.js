/**
 * Set a company's sector (for Group/Sector shown in resources-center and quickview).
 * Group and sector names come from the sectors collection (group_name, name).
 *
 * Usage:
 *   node scripts/set-company-sector.js <companyId> <sectorId>
 *
 * To list sectors: run with no args or use GET api/company/groups-sectors (sectors have id, name, group_name).
 *
 * Example:
 *   node scripts/set-company-sector.js 6994af7e1c64cedc200bd8c8 507f1f77bcf86cd799439011
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const companyId = process.argv[2];
const sectorId = process.argv[3];

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
  const companiesColl = db.collection('companies');
  const sectorsColl = db.collection('sectors');

  if (!companyId) {
    const sectors = await sectorsColl.find({}).sort({ group_name: 1, name: 1 }).project({ name: 1, group_name: 1 }).toArray();
    console.log('Usage: node scripts/set-company-sector.js <companyId> <sectorId>');
    console.log('');
    console.log('Sectors (use _id as sectorId):');
    sectors.forEach((s) => console.log(`  ${s._id}  group="${s.group_name || ''}"  name="${s.name || ''}"`));
    await client.close();
    return;
  }

  if (!sectorId) {
    const sectors = await sectorsColl.find({}).sort({ group_name: 1, name: 1 }).project({ name: 1, group_name: 1 }).toArray();
    console.log('Usage: node scripts/set-company-sector.js <companyId> <sectorId>');
    console.log('');
    console.log('Sectors in DB (copy an _id as sectorId):');
    if (sectors.length === 0) {
      console.log('  (none found – seed sectors or use API GET api/company/groups-sectors to see ids)');
    } else {
      sectors.forEach((s) => console.log(`  ${s._id}  group="${s.group_name || ''}"  name="${s.name || ''}"`));
    }
    await client.close();
    return;
  }

  let cId;
  let sId;
  try {
    cId = new ObjectId(companyId);
    sId = new ObjectId(sectorId);
  } catch (_) {
    console.error('Invalid companyId or sectorId (must be valid ObjectIds)');
    process.exit(1);
  }

  const [company, sector] = await Promise.all([
    companiesColl.findOne({ _id: cId }),
    sectorsColl.findOne({ _id: sId }),
  ]);

  if (!company) {
    console.error('Company not found:', companyId);
    process.exit(1);
  }
  if (!sector) {
    console.error('Sector not found:', sectorId);
    process.exit(1);
  }

  await companiesColl.updateOne({ _id: cId }, { $set: { mst_sector_id: sId } });
  console.log('Updated company', companyId, '-> sector', sectorId);
  console.log('  Group:', sector.group_name || '');
  console.log('  Sector:', sector.name || '');
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
