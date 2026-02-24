/**
 * Set document_type on a resource document (e.g. fix 'general' -> 'assessment_submittal').
 * Use after list-resource-documents.js to fix docs so they appear in assessment_submittals.
 *
 * Usage:
 *   node scripts/set-resource-document-type.js <documentId> <document_type>
 *
 * document_type: e.g. assessment_submittal, launch_training, hand_holding_1, hand_holding_2, hand_holding_3, general
 *
 * Examples:
 *   node scripts/set-resource-document-type.js 6789abcd1234567890 assessment_submittal
 *   node scripts/set-resource-document-type.js 6789abcd1234567890 general
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const documentId = process.argv[2];
const documentType = process.argv[3];

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
  if (!documentId || !documentType) {
    console.error('Usage: node scripts/set-resource-document-type.js <documentId> <document_type>');
    console.error('Example: node scripts/set-resource-document-type.js 6789abcd1234567890 assessment_submittal');
    process.exit(1);
  }

  let id;
  try {
    id = new ObjectId(documentId);
  } catch (_) {
    console.error('Invalid documentId:', documentId);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('companyresourcedocuments');

  const result = await coll.updateOne(
    { _id: id },
    { $set: { document_type: documentType, updatedAt: new Date() } },
  );

  if (result.matchedCount === 0) {
    console.error('Document not found:', documentId);
    process.exit(1);
  }

  console.log('Updated document', documentId, '-> document_type:', documentType);
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
