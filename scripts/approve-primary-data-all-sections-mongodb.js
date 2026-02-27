/**
 * Approve ALL Primary Data sections for a project (CII/admin simulation).
 * Sets document_status = 1 (Accepted) for all primary_data_form rows,
 * logs "CII Approved All Primary Data" (milestone 12, completed),
 * and advances next_activities_id to at least 13
 * ("All Checklist / Assessment Documents Uploaded by Company").
 *
 * Usage:
 *   node scripts/approve-primary-data-all-sections-mongodb.js <projectId>
 *
 * Example:
 *   node scripts/approve-primary-data-all-sections-mongodb.js 699ea4b08976cf56e00396f9
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
    console.error('Usage: node scripts/approve-primary-data-all-sections-mongodb.js <projectId>');
    console.error('  projectId = 24-char hex MongoDB ObjectId of the company project');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);

  const projectsColl = db.collection('companyprojects');
  const formColl = db.collection('primary_data_form');
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

  const count = await formColl.countDocuments({ company_id: companyId, project_id: projectId });
  if (count === 0) {
    console.warn('No primary_data_form rows found for this project/company. Nothing to approve.');
    await client.close();
    process.exit(0);
  }

  // Set document_status = 1 (Accepted) for all rows
  const updateResult = await formColl.updateMany(
    { company_id: companyId, project_id: projectId },
    { $set: { document_status: 1, document_remarks: null, updatedAt: now } },
  );
  console.log('Set document_status=1 (Accepted) on', updateResult.modifiedCount, 'primary_data_form row(s).');

  // Log milestone 12: CII Approved All Primary Data
  await activitiesColl.insertOne({
    company_id: companyId,
    project_id: projectId,
    description: 'CII Approved All Primary Data',
    activity_type: 'cii',
    milestone_flow: 12,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Activity logged: CII Approved All Primary Data (milestone 12).');

  // Advance next_activities_id to at least 13 (All Checklist / Assessment Documents Uploaded by Company)
  const freshProject = await projectsColl.findOne({ _id: projectId });
  const currentNext =
    typeof freshProject?.next_activities_id === 'number'
      ? freshProject.next_activities_id
      : 0;
  if (currentNext < 13) {
    await projectsColl.updateOne(
      { _id: projectId },
      { $set: { next_activities_id: 13, updatedAt: now } },
    );
    console.log('next_activities_id advanced to 13 (All Checklist / Assessment Documents Uploaded by Company).');
  }

  // Optional: single notification to company about approval
  await notificationsColl.insertOne({
    title: 'Primary Data Approved',
    content: 'GreenCo Team has approved your Primary Data. You can proceed to upload assessment/checklist documents.',
    notify_type: 'C',
    user_id: companyId,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Notification created for company (Primary Data Approved).');

  await client.close();
  console.log('\nDone. Primary Data approved for project', projectIdRaw);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

