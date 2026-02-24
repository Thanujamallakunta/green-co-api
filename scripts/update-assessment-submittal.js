/**
 * Update an Assessment Submittal record in MongoDB (by _id).
 *
 * Usage:
 *   node scripts/update-assessment-submittal.js <submittalId> [--title "Title"] [--description "Desc"] [--status 0|1|2|3] [--remarks "Remarks"]
 *
 * status: 0=Pending, 1=Accepted, 2=Not Accepted, 3=Under Review
 *
 * Examples:
 *   node scripts/update-assessment-submittal.js 6789abcd1234567890 --status 1
 *   node scripts/update-assessment-submittal.js 6789abcd1234567890 --status 1 --remarks "Approved after review"
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const args = process.argv.slice(2);
const submittalId = args[0];

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco_db';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco_db');
  }
}

function parseArgs() {
  const out = { title: null, description: null, status: null, remarks: null };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1] != null) {
      out.title = args[++i];
    } else if (args[i] === '--description' && args[i + 1] != null) {
      out.description = args[++i];
    } else if (args[i] === '--status' && args[i + 1] != null) {
      const n = parseInt(args[++i], 10);
      if (![0, 1, 2, 3].includes(n)) {
        console.error('--status must be 0, 1, 2, or 3');
        process.exit(1);
      }
      out.status = n;
    } else if (args[i] === '--remarks' && args[i + 1] != null) {
      out.remarks = args[++i];
    }
  }
  return out;
}

async function run() {
  if (!submittalId) {
    console.error('Usage: node scripts/update-assessment-submittal.js <submittalId> [--title "Title"] [--description "Desc"] [--status 0|1|2|3] [--remarks "Remarks"]');
    console.error('Example: node scripts/update-assessment-submittal.js 6789abcd1234567890 --status 1');
    process.exit(1);
  }

  const { title, description, status, remarks } = parseArgs();
  if (title === null && description === null && status === null && remarks === null) {
    console.error('Provide at least one of: --title, --description, --status, --remarks');
    process.exit(1);
  }

  let id;
  try {
    id = new ObjectId(submittalId);
  } catch (_) {
    console.error('Invalid submittalId (must be a valid ObjectId):', submittalId);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('companyresourcedocuments');

  const update = { updatedAt: new Date() };
  if (title !== null) update.document_title = title;
  if (description !== null) update.description = description;
  if (status !== null) update.document_status = status;
  if (remarks !== null) update.document_remarks = remarks;

  const result = await coll.updateOne(
    { _id: id, document_type: 'assessment_submittal' },
    { $set: update },
  );

  if (result.matchedCount === 0) {
    console.error('Assessment submittal not found or not an assessment_submittal:', submittalId);
    process.exit(1);
  }

  console.log('Updated assessment submittal:', submittalId);
  if (title !== null) console.log('  document_title:', title);
  if (description !== null) console.log('  description:', description);
  if (status !== null) {
    const label = { 0: 'Pending', 1: 'Accepted', 2: 'Not Accepted', 3: 'Under Review' }[status];
    console.log('  document_status:', status, `(${label})`);
  }
  if (remarks !== null) console.log('  document_remarks:', remarks);
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
