/**
 * List Assessment Submittals from MongoDB (companyresourcedocuments with document_type = 'assessment_submittal').
 *
 * Usage:
 *   node scripts/list-assessment-submittals.js [projectId]
 *
 * Examples:
 *   # List all assessment submittals across all projects
 *   node scripts/list-assessment-submittals.js
 *
 *   # List assessment submittals for one project
 *   node scripts/list-assessment-submittals.js 6994af7e1c64cedc200bd8ca
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
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('companyresourcedocuments');

  const filter = { document_type: 'assessment_submittal', is_active: true };
  if (projectId) {
    try {
      filter.project_id = new ObjectId(projectId);
    } catch (_) {
      console.error('Invalid projectId (must be a valid ObjectId):', projectId);
      process.exit(1);
    }
  }

  const docs = await coll.find(filter).sort({ createdAt: -1 }).toArray();

  if (docs.length === 0) {
    console.log(projectId ? `No assessment submittals for project ${projectId}.` : 'No assessment submittals in database.');
    await client.close();
    return;
  }

  console.log(projectId ? `Assessment submittals for project ${projectId}:` : 'All assessment submittals:');
  console.log('='.repeat(80));
  docs.forEach((doc, i) => {
    const status = { 0: 'Pending', 1: 'Accepted', 2: 'Not Accepted', 3: 'Under Review' }[doc.document_status ?? 0] || doc.document_status;
    console.log(`${i + 1}. _id: ${doc._id}`);
    console.log(`   project_id: ${doc.project_id}`);
    console.log(`   company_id: ${doc.company_id}`);
    console.log(`   document_url: ${doc.document_url || ''}`);
    console.log(`   document_filename: ${doc.document_filename || ''}`);
    console.log(`   document_title: ${doc.document_title || ''}`);
    console.log(`   description: ${doc.description || ''}`);
    console.log(`   document_status: ${status} (${doc.document_status ?? 0})`);
    console.log(`   created: ${doc.createdAt ? doc.createdAt.toISOString() : ''}`);
    console.log('');
  });
  console.log('='.repeat(80));
  console.log(`Total: ${docs.length}`);
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
