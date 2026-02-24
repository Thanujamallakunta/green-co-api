/**
 * Add an Assessment Submittal record directly in MongoDB.
 * Use when a file already exists on disk (e.g. uploads/resources/<projectId>/<filename>).
 *
 * Usage:
 *   node scripts/add-assessment-submittal.js <projectId> <documentPathOrFilename> [document_title] [description] [document_status]
 *
 * document_status: 0=Pending, 1=Accepted, 2=Not Accepted, 3=Under Review (default 0)
 *
 * Examples:
 *   # Add with path relative to project root
 *   node scripts/add-assessment-submittal.js 6994af7e1c64cedc200bd8ca "uploads/resources/6994af7e1c64cedc200bd8ca/GSC_Evidence.pdf"
 *
 *   # Add with just filename (script builds path as uploads/resources/<projectId>/<filename>)
 *   node scripts/add-assessment-submittal.js 6994af7e1c64cedc200bd8ca GSC_Evidence.pdf "GSC Evidence" "GSC"
 *
 *   # Set status to Accepted (1)
 *   node scripts/add-assessment-submittal.js 6994af7e1c64cedc200bd8ca GSC_Evidence.pdf "GSC Evidence" "GSC" 1
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const args = process.argv.slice(2);
const projectId = args[0];
const documentPathOrFilename = args[1];
const documentTitle = args[2];
const description = args[3];
const documentStatus = args[4] !== undefined ? parseInt(args[4], 10) : 0;

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
  if (!projectId || !documentPathOrFilename) {
    console.error('Usage: node scripts/add-assessment-submittal.js <projectId> <documentPathOrFilename> [document_title] [description] [document_status]');
    console.error('Example: node scripts/add-assessment-submittal.js 6994af7e1c64cedc200bd8ca GSC_Evidence.pdf "GSC Evidence" "GSC" 0');
    process.exit(1);
  }

  if (![0, 1, 2, 3].includes(documentStatus)) {
    console.error('document_status must be 0 (Pending), 1 (Accepted), 2 (Not Accepted), or 3 (Under Review)');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const resourcesColl = db.collection('companyresourcedocuments');

  const project = await projectsColl.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = project.company_id;
  let documentUrl = documentPathOrFilename;
  let documentFilename = path.basename(documentPathOrFilename);

  if (!documentPathOrFilename.includes('/') || !documentPathOrFilename.startsWith('uploads/')) {
    documentUrl = `uploads/resources/${projectId}/${documentPathOrFilename}`;
    documentFilename = documentPathOrFilename;
    console.log('Using document_url:', documentUrl);
  }

  const now = new Date();
  const doc = {
    company_id: companyId,
    project_id: new ObjectId(projectId),
    document_url: documentUrl,
    document_filename: documentFilename,
    document_title: documentTitle || documentFilename,
    document_type: 'assessment_submittal',
    description: description || '',
    document_status: documentStatus,
    is_active: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await resourcesColl.insertOne(doc);
  console.log('Added assessment submittal:');
  console.log('  _id:', result.insertedId.toString());
  console.log('  project_id:', projectId);
  console.log('  company_id:', companyId.toString());
  console.log('  document_url:', doc.document_url);
  console.log('  document_title:', doc.document_title);
  console.log('  description:', doc.description);
  const statusLabel = { 0: 'Pending', 1: 'Accepted', 2: 'Not Accepted', 3: 'Under Review' }[doc.document_status];
  console.log('  document_status:', doc.document_status, `(${statusLabel})`);
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
