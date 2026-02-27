/**
 * Submit Assessment Submittals for all tabs for a project (simulate company completion).
 *
 * Assumes assessment submittal documents already exist in companyresourcedocuments
 * with document_type: 'assessment_submittal' for the project.
 *
 * This script:
 * - Logs activity "All Checklist / Assessment Documents Uploaded by Company"
 *   with milestone_flow: 13, milestone_completed: true
 * - Advances next_activities_id to at least 14
 *   ("CII Approved All Assessment Submittal" as the next step)
 * - Optionally creates a company notification
 *
 * Usage:
 *   node scripts/submit-assessment-submittals-mongodb.js <projectId>
 *
 * Example:
 *   node scripts/submit-assessment-submittals-mongodb.js 699ea4b08976cf56e00396f9
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
    console.error('Usage: node scripts/submit-assessment-submittals-mongodb.js <projectId>');
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

  // Ensure there is at least one assessment submittal document
  const submittalCount = await resourceColl.countDocuments({
    company_id: companyId,
    project_id: projectId,
    document_type: 'assessment_submittal',
    is_active: true,
  });
  if (submittalCount === 0) {
    console.warn('No assessment_submittal documents found for this project/company. Run fill-assessment-submittals-mongodb.js first.');
    await client.close();
    process.exit(0);
  }

  // Log milestone 13: All Checklist / Assessment Documents Uploaded by Company
  await activitiesColl.insertOne({
    company_id: companyId,
    project_id: projectId,
    description: 'All Checklist / Assessment Documents Uploaded by Company',
    activity_type: 'company',
    milestone_flow: 13,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Activity logged: All Checklist / Assessment Documents Uploaded by Company (milestone 13).');

  // Advance next_activities_id to at least 14 (CII Approved All Assessment Submittal)
  const freshProject = await projectsColl.findOne({ _id: projectId });
  const currentNext =
    typeof freshProject?.next_activities_id === 'number'
      ? freshProject.next_activities_id
      : 0;
  if (currentNext < 14) {
    await projectsColl.updateOne(
      { _id: projectId },
      { $set: { next_activities_id: 14, updatedAt: now } },
    );
    console.log('next_activities_id advanced to 14 (CII Approved All Assessment Submittal).');
  }

  // Notification to company (optional)
  await notificationsColl.insertOne({
    title: 'Assessment Submittals Uploaded',
    content: 'All checklist / assessment documents have been uploaded for your project. GreenCo Team will review them.',
    notify_type: 'C',
    user_id: companyId,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Notification created for company (Assessment Submittals Uploaded).');

  await client.close();
  console.log('\nDone. Assessment submittals submitted for project', projectIdRaw);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

