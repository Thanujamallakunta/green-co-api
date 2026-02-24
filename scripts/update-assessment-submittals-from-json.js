/**
 * Bulk-update assessment submittals from a JSON file (approval status and/or remarks).
 *
 * Usage:
 *   node scripts/update-assessment-submittals-from-json.js <path-to.json>
 *
 * JSON format (array of updates):
 * [
 *   { "id": "699b05ffe4f1acea5825f72b", "document_status": 1, "document_remarks": "Approved" },
 *   { "id": "699b06908e6636f8a26cee2c", "document_status": 2, "document_remarks": "Needs revision" },
 *   ...
 * ]
 *
 * Or object with key "updates": { "updates": [ ... ] }
 *
 * document_status: 0=Pending, 1=Accepted, 2=Not Accepted, 3=Under Review (optional per row).
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

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
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node scripts/update-assessment-submittals-from-json.js <path-to.json>');
    console.error('Example: node scripts/update-assessment-submittals-from-json.js scripts/data/assessment-submittals-updates.json');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), jsonPath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (e) {
    console.error('Invalid JSON:', e.message);
    process.exit(1);
  }

  const list = Array.isArray(data) ? data : (data && data.updates) ? data.updates : [];
  if (list.length === 0) {
    console.log('No updates in JSON (use array or { "updates": [ ... ] }).');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('companyresourcedocuments');

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const docId = item.id || item.documentId || item._id;
    if (!docId) {
      console.warn(`[${i + 1}] Skip: missing id`);
      skipped++;
      continue;
    }

    let id;
    try {
      id = new ObjectId(docId);
    } catch (_) {
      console.warn(`[${i + 1}] Skip: invalid id`, docId);
      skipped++;
      continue;
    }

    const set = { updatedAt: new Date() };
    if (item.document_status !== undefined && item.document_status !== null) {
      const s = parseInt(item.document_status, 10);
      if ([0, 1, 2, 3].includes(s)) set.document_status = s;
    }
    if (item.document_remarks !== undefined) set.document_remarks = String(item.document_remarks);

    if (Object.keys(set).length <= 1) {
      console.warn(`[${i + 1}] Skip: no document_status or document_remarks to set`);
      skipped++;
      continue;
    }

    const result = await coll.updateOne(
      { _id: id, document_type: 'assessment_submittal' },
      { $set: set },
    );

    if (result.matchedCount === 0) {
      console.warn(`[${i + 1}] Skip: document not found or not assessment_submittal:`, docId);
      skipped++;
      continue;
    }

    updated++;
    console.log(`[${i + 1}] Updated: ${docId}`);
  }

  await client.close();
  console.log('');
  console.log('Done. Updated:', updated, 'Skipped:', skipped);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
