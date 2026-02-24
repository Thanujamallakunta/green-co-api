/**
 * Create directory structure for Launch and Training (Site Visit Report) uploads:
 *   uploads/companyproject/launchAndTraining/{company_id}/
 *
 * Usage:
 *   node scripts/create-launch-and-training-dirs.js <projectId>
 *
 * Looks up company_id from the project in DB and creates the folder.
 * If projectId is omitted, creates only the base folder uploads/companyproject/launchAndTraining/.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const projectId = process.argv[2];
const baseDir = path.join(process.cwd(), 'uploads', 'companyproject', 'launchAndTraining');

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
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log('Created:', baseDir);
  } else {
    console.log('Exists:', baseDir);
  }

  if (!projectId) {
    console.log('Done. Run with a projectId to create uploads/companyproject/launchAndTraining/<company_id>/');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const project = await db.collection('companyprojects').findOne({ _id: new ObjectId(projectId) });
  await client.close();

  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = (project.company_id && project.company_id.toString)
    ? project.company_id.toString()
    : String(project.company_id || '');
  if (!companyId) {
    console.error('Project has no company_id');
    process.exit(1);
  }

  const companyDir = path.join(baseDir, companyId);
  if (!fs.existsSync(companyDir)) {
    fs.mkdirSync(companyDir, { recursive: true });
    console.log('Created:', companyDir);
  } else {
    console.log('Exists:', companyDir);
  }

  console.log('Structure ready: uploads/companyproject/launchAndTraining/' + companyId + '/');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
