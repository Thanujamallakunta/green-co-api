/**
 * Add Assessment Submittals from a JSON file (dynamic/bulk).
 * Each item in the JSON can specify projectId, document path/filename, title, description, status.
 *
 * Usage:
 *   node scripts/add-assessment-submittals-from-json.js <path-to.json>
 *
 * JSON format (array of submittals):
 * [
 *   {
 *     "projectId": "6994af7e1c64cedc200bd8ca",
 *     "documentPathOrFilename": "GSC_Evidence.pdf",
 *     "document_title": "GSC Evidence",
 *     "description": "GSC",
 *     "document_status": 0
 *   },
 *   ...
 * ]
 *
 * Or object with key "submittals":
 * { "submittals": [ ... ] }
 *
 * document_status: 0=Pending, 1=Accepted, 2=Not Accepted, 3=Under Review (default 0).
 * If documentPathOrFilename has no "/" or doesn't start with "uploads/", path becomes uploads/resources/<projectId>/<filename>.
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
    console.error('Usage: node scripts/add-assessment-submittals-from-json.js <path-to.json>');
    console.error('Example: node scripts/add-assessment-submittals-from-json.js scripts/data/assessment-submittals.json');
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

  const list = Array.isArray(data) ? data : (data && data.submittals) ? data.submittals : [];
  if (list.length === 0) {
    console.log('No submittals in JSON (use array or { "submittals": [ ... ] }).');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const resourcesColl = db.collection('companyresourcedocuments');

  let added = 0;
  let skipped = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const projectId = item.projectId || item.project_id;
    const documentPathOrFilename = item.documentPathOrFilename || item.document_url || item.document_filename;
    if (!projectId || !documentPathOrFilename) {
      console.warn(`[${i + 1}] Skip: missing projectId or documentPathOrFilename`);
      skipped++;
      continue;
    }

    let docStatus = 0;
    if (item.document_status !== undefined && item.document_status !== null) {
      docStatus = parseInt(item.document_status, 10);
      if (![0, 1, 2, 3].includes(docStatus)) docStatus = 0;
    }

    const project = await projectsColl.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      console.warn(`[${i + 1}] Skip: project not found ${projectId}`);
      skipped++;
      continue;
    }

    const companyId = project.company_id;
    let documentUrl = documentPathOrFilename;
    let documentFilename = path.basename(documentPathOrFilename);
    if (!documentPathOrFilename.includes('/') || !documentPathOrFilename.startsWith('uploads/')) {
      documentUrl = `uploads/resources/${projectId}/${documentPathOrFilename}`;
      documentFilename = documentPathOrFilename;
    }

    const now = new Date();
    const doc = {
      company_id: companyId,
      project_id: new ObjectId(projectId),
      document_url: documentUrl,
      document_filename: documentFilename,
      document_title: item.document_title != null ? item.document_title : documentFilename,
      document_type: 'assessment_submittal',
      description: item.description != null ? String(item.description) : '',
      document_status: docStatus,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    };

    await resourcesColl.insertOne(doc);
    added++;
    console.log(`[${i + 1}] Added: ${documentFilename} (project ${projectId})`);
  }

  await client.close();
  console.log('');
  console.log('Done. Added:', added, 'Skipped:', skipped);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
