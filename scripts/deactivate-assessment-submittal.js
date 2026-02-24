/**
 * Deactivate an Assessment Submittal in MongoDB (sets is_active = false).
 * Deactivated records are excluded from API responses.
 *
 * Usage:
 *   node scripts/deactivate-assessment-submittal.js <submittalId>
 *
 * Example:
 *   node scripts/deactivate-assessment-submittal.js 6789abcd1234567890
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const submittalId = process.argv[2];

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
  if (!submittalId) {
    console.error('Usage: node scripts/deactivate-assessment-submittal.js <submittalId>');
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

  const result = await coll.updateOne(
    { _id: id, document_type: 'assessment_submittal' },
    { $set: { is_active: false, updatedAt: new Date() } },
  );

  if (result.matchedCount === 0) {
    console.error('Assessment submittal not found or not an assessment_submittal:', submittalId);
    process.exit(1);
  }

  console.log('Deactivated assessment submittal:', submittalId);
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
