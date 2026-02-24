/**
 * Seed or list master_primary_data_checklist (Primary Data sections and parameters).
 * Sections: General Information, Energy Efficiency, Water Conservation, Water & Wastewater,
 *           Renewable Energy, Greenhouse Gas Emissions, Waste Management,
 *           Material Conservation, Green Supply Chain, Product Stewardship, Green Infrastructure, Targets.
 *
 * Usage:
 *   node scripts/seed-primary-data-master.js          # Seed 12 sections (one row each) if missing
 *   node scripts/seed-primary-data-master.js list    # List all master rows grouped by info_type
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const COLL = 'master_primary_data_checklist';

const SECTIONS = [
  { info_type: 'gi', label: 'General Information', order: 10 },
  { info_type: 'ee', label: 'Energy Efficiency', order: 20 },
  { info_type: 'wc', label: 'Water Conservation', order: 30 },
  { info_type: 'ww', label: 'Water & Wastewater', order: 35 },
  { info_type: 're', label: 'Renewable Energy', order: 40 },
  { info_type: 'gge', label: 'Greenhouse Gas Emissions', order: 50 },
  { info_type: 'wm', label: 'Waste Management', order: 60 },
  { info_type: 'mcr', label: 'Material Conservation, Recycling and Recyclables', order: 70 },
  { info_type: 'gsc', label: 'Green Supply Chain', order: 80 },
  { info_type: 'ps', label: 'Product Stewardship', order: 90 },
  { info_type: 'gin', label: 'Green Infrastructure', order: 100 },
  { info_type: 'tar', label: 'Targets', order: 110 },
];

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco_db';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco_db');
  }
}

async function list(db) {
  const rows = await db.collection(COLL).find({}).sort({ info_type: 1, checklist_order: 1 }).toArray();
  const byType = {};
  for (const r of rows) {
    const t = r.info_type || '?';
    if (!byType[t]) byType[t] = [];
    byType[t].push(r);
  }
  console.log('master_primary_data_checklist:');
  for (const [infoType, arr] of Object.entries(byType)) {
    const label = arr[0].checklist_name || infoType;
    console.log(`  ${infoType} (${label}): ${arr.length} row(s)`);
    arr.slice(0, 3).forEach((r, i) => {
      console.log(`    ${i + 1}. _id=${r._id} order=${r.checklist_order} parameter=${r.parameter || '-'} unit=${r.reference_unit || '-'}`);
    });
    if (arr.length > 3) console.log(`    ... and ${arr.length - 3} more`);
  }
  console.log(`Total: ${rows.length} row(s)`);
  console.log('Tip: use _id as data_id in add-primary-data-from-json.js, or omit data_id and use info_type + parameter.');
}

async function seed(db) {
  let inserted = 0;
  for (const sec of SECTIONS) {
    const existing = await db.collection(COLL).findOne({ info_type: sec.info_type });
    if (existing) {
      console.log(`Section "${sec.info_type}" (${sec.label}) already exists, skip.`);
      continue;
    }
    await db.collection(COLL).insertOne({
      info_type: sec.info_type,
      checklist_name: sec.label,
      checklist_order: sec.order,
      parameter: sec.label + ' – Parameter 1',
      reference_unit: '',
      is_calculate: 0,
      is_active: 1,
    });
    console.log(`Inserted section: ${sec.info_type} – ${sec.label}`);
    inserted++;
  }
  if (inserted > 0) {
    console.log(`Done. Inserted ${inserted} section(s).`);
  } else {
    console.log('Done. All 12 sections already exist in the database. Primary Data is ready.');
  }
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const cmd = process.argv[2];
  if (cmd === 'list') {
    await list(db);
  } else {
    await seed(db);
  }
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
