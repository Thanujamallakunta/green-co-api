/**
 * Approve ALL Assessment Submittals for a project (simulate CII step 14).
 *
 * Sets document_status = 1 (Accepted) for all companyresourcedocuments
 * with document_type: 'assessment_submittal' for the project,
 * logs "CII Approved All Assessment Submittal" (milestone 14, completed),
 * and advances next_activities_id to at least 15
 * ("CII Assigned an Assessor" as the next step).
 *
 * Usage:
 *   node scripts/approve-assessment-submittals-all-mongodb.js <projectId>
 *
 * Example:
 *   node scripts/approve-assessment-submittals-all-mongodb.js 699ea4b08976cf56e00396f9
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
    console.error('Usage: node scripts/approve-assessment-submittals-all-mongodb.js <projectId>');
    console.error('  projectId = 24-char hex MongoDB ObjectId of the company project');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);

  const projectsColl = db.collection('companyprojects');
  const resourceColl = db.collection('companyresourcedocuments');
  const activitiesColl = db.collection('companyactivities');
  const notificationsColl = db.collection('notifications');

  const projectId = new ObjectId(projectIdRaw);
  const project = await projectsColl.findOne({ _id: projectId });
  if (!project) {
    console.error('Project not found:', projectIdRaw);
    await client.close();
    process.exit(1);
  }

  const companyId = project.company_id;
  const now = new Date();

  const count = await resourceColl.countDocuments({
    company_id: companyId,
    project_id: projectId,
    document_type: 'assessment_submittal',
    is_active: true,
  });
  if (count === 0) {
    console.warn('No assessment_submittal documents found for this project/company. Nothing to approve.');
    await client.close();
    process.exit(0);
  }

  // Set document_status = 1 (Accepted) for all assessment submittals
  const updateResult = await resourceColl.updateMany(
    {
      company_id: companyId,
      project_id: projectId,
      document_type: 'assessment_submittal',
      is_active: true,
    },
    { $set: { document_status: 1, document_remarks: null, updatedAt: now } },
  );
  console.log('Set document_status=1 (Accepted) on', updateResult.modifiedCount, 'assessment_submittal document(s).');

  // Log milestone 14: CII Approved All Assessment Submittal
  await activitiesColl.insertOne({
    company_id: companyId,
    project_id: projectId,
    description: 'CII Approved All Assessment Submittal',
    activity_type: 'cii',
    milestone_flow: 14,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Activity logged: CII Approved All Assessment Submittal (milestone 14).');

  // Advance next_activities_id to at least 15 (CII Assigned an Assessor)
  const freshProject = await projectsColl.findOne({ _id: projectId });
  const currentNext =
    typeof freshProject?.next_activities_id === 'number'
      ? freshProject.next_activities_id
      : 0;
  if (currentNext < 15) {
    await projectsColl.updateOne(
      { _id: projectId },
      { $set: { next_activities_id: 15, updatedAt: now } },
    );
    console.log('next_activities_id advanced to 15 (CII Assigned an Assessor).');
  }

  // Optional notification to company
  await notificationsColl.insertOne({
    title: 'Assessment Submittals Approved',
    content: 'GreenCo Team has approved all your assessment submittals. Assessor assignment / further scoring steps will follow.',
    notify_type: 'C',
    user_id: companyId,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Notification created for company (Assessment Submittals Approved).');

  await client.close();
  console.log('\nDone. Assessment submittals approved for project', projectIdRaw);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

