/**
 * Set document_remarks (and optionally document_status) for assessment submittals
 * that have description in MS, EM, CBM, WTM, MRM, GBE (or any list you pass).
 * Use when remarks are not showing because those records have no remarks in the DB.
 *
 * Usage:
 *   node scripts/set-remarks-for-categories.js <projectId> [remarks] [status]
 *
 * If remarks is omitted, uses "Approved". If status is omitted, keeps existing (or 1).
 * Only updates docs that have description in: MS, EM, CBM, WTM, MRM, GBE.
 *
 * Example:
 *   node scripts/set-remarks-for-categories.js 6994af7e1c64cedc200bd8ca "Approved" 1
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

const CATEGORIES = ['MS', 'EM', 'CBM', 'WTM', 'MRM', 'GBE'];

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
  const projectId = process.argv[2];
  const remarks = process.argv[3] != null ? process.argv[3] : 'Approved';
  const statusArg = process.argv[4];
  const status = statusArg !== undefined && statusArg !== '' ? parseInt(statusArg, 10) : undefined;

  if (!projectId) {
    console.error('Usage: node scripts/set-remarks-for-categories.js <projectId> [remarks] [status]');
    console.error('Example: node scripts/set-remarks-for-categories.js 6994af7e1c64cedc200bd8ca "Approved" 1');
    process.exit(1);
  }

  let pId;
  try {
    pId = new ObjectId(projectId);
  } catch (_) {
    console.error('Invalid projectId:', projectId);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('companyresourcedocuments');

  const docs = await coll.find({
    project_id: pId,
    document_type: 'assessment_submittal',
    is_active: true,
    description: { $in: CATEGORIES },
  }).toArray();

  if (docs.length === 0) {
    console.log('No assessment submittals found for MS, EM, CBM, WTM, MRM, GBE in project', projectId);
    await client.close();
    return;
  }

  const update = { document_remarks: remarks, updatedAt: new Date() };
  if (status !== undefined && [0, 1, 2, 3].includes(status)) update.document_status = status;

  let updated = 0;
  for (const doc of docs) {
    const result = await coll.updateOne(
      { _id: doc._id },
      { $set: update },
    );
    if (result.modifiedCount) updated++;
    console.log('Updated:', doc.description, doc._id.toString(), '-> remarks:', remarks);
  }

  await client.close();
  console.log('');
  console.log('Done. Updated', updated, 'of', docs.length);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
