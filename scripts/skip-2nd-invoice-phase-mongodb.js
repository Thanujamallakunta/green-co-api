/**
 * Skip the "2nd Invoice" phase (steps 19–21) for a project.
 * Marks 19 (2nd Invoice uploaded), 20 (Payment Receipt uploaded), 21 (Payment acknowledged)
 * as completed and sets next_activities_id to 22 (Plaque & certificate dispatched).
 * Use when you do not want the "2nd Invoice uploaded" step in the flow.
 *
 * Usage:
 *   node scripts/skip-2nd-invoice-phase-mongodb.js <projectId>
 *
 * Example:
 *   node scripts/skip-2nd-invoice-phase-mongodb.js 699ea4b08976cf56e00396f9
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';

function getDb(client) {
  try {
    const url = new URL(MONGODB_URI);
    const pathname = url.pathname || '/';
    const dbName = pathname && pathname !== '/' ? pathname.slice(1) : 'greenco';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco');
  }
}

const STEPS_TO_LOG = [
  { milestone_flow: 19, description: '2nd Invoice uploaded' },
  { milestone_flow: 20, description: 'Payment Receipt of 2nd Invoice uploaded' },
  { milestone_flow: 21, description: 'Payment Receipt of 2nd Invoice acknowledged' },
];

async function run() {
  const projectIdRaw = process.argv[2];
  if (!projectIdRaw || projectIdRaw.length !== 24 || !/^[a-f0-9]+$/i.test(projectIdRaw)) {
    console.error('Usage: node scripts/skip-2nd-invoice-phase-mongodb.js <projectId>');
    console.error('  projectId = 24-char hex MongoDB ObjectId of the company project');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);

  const projectsColl = db.collection('companyprojects');
  const activitiesColl = db.collection('companyactivities');

  const projectId = new ObjectId(projectIdRaw);
  const project = await projectsColl.findOne({ _id: projectId });
  if (!project) {
    console.error('Project not found:', projectIdRaw);
    await client.close();
    process.exit(1);
  }

  const companyId = project.company_id;
  const now = new Date();

  for (const step of STEPS_TO_LOG) {
    await activitiesColl.insertOne({
      company_id: companyId,
      project_id: projectId,
      description: step.description,
      activity_type: step.milestone_flow === 20 ? 'company' : 'cii',
      milestone_flow: step.milestone_flow,
      milestone_completed: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Logged:', step.description, '(milestone', step.milestone_flow + ')');
  }

  const currentNext = typeof project.next_activities_id === 'number' ? project.next_activities_id : 0;
  if (currentNext < 22) {
    await projectsColl.updateOne(
      { _id: projectId },
      { $set: { next_activities_id: 22, updatedAt: now } },
    );
    console.log('next_activities_id set to 22 (Plaque & certificate dispatched).');
  } else {
    console.log('next_activities_id already >= 22; not changed.');
  }

  console.log('\nDone. Next Step will show: Plaque & certificate dispatched (CII).');
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
