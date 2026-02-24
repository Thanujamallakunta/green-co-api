/**
 * Seed one assessment submittal per category (GSC, IE, PSL, MS, EM, CBM, WTM, MRM, GBE) for a project.
 * Each doc has description = category code so the frontend can filter by tab.
 *
 * Usage:
 *   node scripts/seed-assessment-submittals-by-category.js <projectId> [documentPathOrFilename]
 *
 * If documentPathOrFilename is omitted, uses sample.pdf (uploads/resources/<projectId>/sample.pdf).
 *
 * Example:
 *   node scripts/seed-assessment-submittals-by-category.js 6994af7e1c64cedc200bd8ca
 *   node scripts/seed-assessment-submittals-by-category.js 6994af7e1c64cedc200bd8ca sample.pdf
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

const CATEGORIES = [
  { code: 'GSC', title: 'Green Supply Chain' },
  { code: 'IE', title: 'Industrial Ecology' },
  { code: 'PSL', title: 'Product Stewardship / Life Cycle' },
  { code: 'MS', title: 'Material Stewardship' },
  { code: 'EM', title: 'Energy Management' },
  { code: 'CBM', title: 'Circular Business Model' },
  { code: 'WTM', title: 'Water & Wastewater Management' },
  { code: 'MRM', title: 'Material Resource Management' },
  { code: 'GBE', title: 'Green Building / Infrastructure' },
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

async function run() {
  const projectId = process.argv[2];
  const documentPathOrFilename = process.argv[3] || 'sample.pdf';

  if (!projectId) {
    console.error('Usage: node scripts/seed-assessment-submittals-by-category.js <projectId> [documentPathOrFilename]');
    console.error('Example: node scripts/seed-assessment-submittals-by-category.js 6994af7e1c64cedc200bd8ca');
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
  }

  let inserted = 0;
  let skipped = 0;

  for (const cat of CATEGORIES) {
    const existing = await resourcesColl.findOne({
      project_id: new ObjectId(projectId),
      document_type: 'assessment_submittal',
      is_active: true,
      description: cat.code,
    });
    if (existing) {
      console.log(`Skip ${cat.code}: already has a submittal`);
      skipped++;
      continue;
    }

    const now = new Date();
    await resourcesColl.insertOne({
      company_id: companyId,
      project_id: new ObjectId(projectId),
      document_url: documentUrl,
      document_filename: documentFilename,
      document_title: `${cat.code} – ${cat.title}`,
      document_type: 'assessment_submittal',
      description: cat.code,
      document_status: 0,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Added: ${cat.code} – ${cat.title}`);
    inserted++;
  }

  await client.close();
  console.log('');
  console.log('Done. Inserted:', inserted, 'Skipped (already exist):', skipped);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
