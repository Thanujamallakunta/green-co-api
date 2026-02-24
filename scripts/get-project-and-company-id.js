/**
 * Print project_id and company_id for use in MongoDB inserts.
 * Usage: node scripts/get-project-and-company-id.js [projectId]
 * If projectId omitted, prints first project.
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const projectId = process.argv[2];

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(new URL(MONGODB_URI).pathname.replace(/^\//, '') || 'greenco_db');

  const filter = projectId ? { _id: new ObjectId(projectId) } : {};
  const p = await db.collection('companyprojects').findOne(filter, { _id: 1, company_id: 1 });

  if (!p) {
    console.error(projectId ? 'Project not found: ' + projectId : 'No projects in database.');
    process.exit(1);
  }

  const pid = p._id.toString();
  const cid = (p.company_id && p.company_id.toString ? p.company_id.toString() : p.company_id) || '';

  console.log('project_id:', pid);
  console.log('company_id:', cid);
  await client.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
