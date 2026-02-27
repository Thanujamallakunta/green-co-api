/**
 * Mark "Final Scoring submitted (Rating Declaration)" (step 17) as completed and advance to step 18.
 * Use when CII has submitted final scoring and you want the flow to show the next step
 * ("Certificate Uploaded").
 *
 * Usage:
 *   node scripts/complete-final-scoring-mongodb.js <projectId>
 *
 * Example:
 *   node scripts/complete-final-scoring-mongodb.js 699ea4b08976cf56e00396f9
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

async function run() {
  const projectIdRaw = process.argv[2];
  if (!projectIdRaw || projectIdRaw.length !== 24 || !/^[a-f0-9]+$/i.test(projectIdRaw)) {
    console.error('Usage: node scripts/complete-final-scoring-mongodb.js <projectId>');
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

  await activitiesColl.insertOne({
    company_id: companyId,
    project_id: projectId,
    description: 'Final Scoring submitted (Rating Declaration)',
    activity_type: 'cii',
    milestone_flow: 17,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Activity logged: Final Scoring submitted (Rating Declaration) (milestone 17).');

  const currentNext = typeof project.next_activities_id === 'number' ? project.next_activities_id : 0;
  if (currentNext < 18) {
    await projectsColl.updateOne(
      { _id: projectId },
      { $set: { next_activities_id: 18, updatedAt: now } },
    );
    console.log('next_activities_id advanced to 18 (Certificate Uploaded).');
  } else {
    console.log('next_activities_id already >= 18, not changed.');
  }

  console.log('Done. Next Step will show: Certificate Uploaded.');
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
