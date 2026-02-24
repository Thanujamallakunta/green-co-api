/**
 * List ALL resource documents for a project (any document_type).
 * Use this to see what's in the DB and why assessment_submittals might be empty
 * (e.g. documents may have document_type 'general' instead of 'assessment_submittal').
 *
 * Usage:
 *   node scripts/list-resource-documents.js <projectId>
 *
 * Example:
 *   node scripts/list-resource-documents.js 6994af7e1c64cedc200bd8ca
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const projectId = process.argv[2];

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
  if (!projectId) {
    console.error('Usage: node scripts/list-resource-documents.js <projectId>');
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

  const docs = await coll.find({ project_id: pId }).sort({ createdAt: -1 }).toArray();

  if (docs.length === 0) {
    console.log('No resource documents for project', projectId);
    console.log('Add some via: POST .../resource-documents (with document_type: "assessment_submittal") or scripts/add-assessment-submittal.js');
    await client.close();
    return;
  }

  console.log('Resource documents for project', projectId, '(collection: companyresourcedocuments)\n');
  console.log('Only documents with document_type === "assessment_submittal" appear in assessment_submittals in the API.\n');
  console.log('='.repeat(80));

  docs.forEach((doc, i) => {
    const type = doc.document_type || '(missing)';
    const willShowInAssessment = type === 'assessment_submittal' ? 'YES' : 'NO';
    console.log(`${i + 1}. _id: ${doc._id}`);
    console.log(`   document_type: ${type}  --> shows in assessment_submittals? ${willShowInAssessment}`);
    console.log(`   document_filename: ${doc.document_filename || ''}`);
    console.log(`   document_title: ${doc.document_title || ''}`);
    console.log(`   is_active: ${doc.is_active}`);
    console.log(`   created: ${doc.createdAt ? doc.createdAt.toISOString() : ''}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`Total: ${docs.length}`);
  const assessmentCount = docs.filter((d) => (d.document_type || '') === 'assessment_submittal').length;
  console.log(`With document_type "assessment_submittal": ${assessmentCount}`);
  if (assessmentCount < docs.length) {
    console.log('\nTo fix: run set-resource-document-type.js <docId> assessment_submittal for each doc that should be an assessment submittal.');
  }
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
