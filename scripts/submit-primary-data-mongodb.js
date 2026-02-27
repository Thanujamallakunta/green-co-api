/**
 * Submit Primary Data for a project via MongoDB.
 * Marks all primary_data_form rows as final_submit = 1, logs the activity
 * "Company has submitted the Primary Form Data", and advances next_activities_id
 * to at least 11 (Company Uploaded All Primary Data), matching the service logic.
 *
 * Usage:
 *   node scripts/submit-primary-data-mongodb.js <projectId>
 *
 * Example:
 *   node scripts/submit-primary-data-mongodb.js 699ea4b08976cf56e00396f9
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco');
  }
}

async function run() {
  const projectIdRaw = process.argv[2];
  if (!projectIdRaw || projectIdRaw.length !== 24 || !/^[a-f0-9]+$/i.test(projectIdRaw)) {
    console.error('Usage: node scripts/submit-primary-data-mongodb.js <projectId>');
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

  // Ensure there is at least one primary data row
  const count = await formColl.countDocuments({ company_id: companyId, project_id: projectId });
  if (count === 0) {
    console.warn('No primary_data_form rows found for this project/company. Fill rows first (via API or add-primary-data-from-json.js).');
    await client.close();
    process.exit(0);
  }

  // Mark all rows as final_submit = 1
  const updateResult = await formColl.updateMany(
    { company_id: companyId, project_id: projectId },
    { $set: { final_submit: 1, updatedAt: now } },
  );
  console.log('Set final_submit=1 on', updateResult.modifiedCount, 'primary_data_form row(s).');

  // Advance next_activities_id to at least 11 (Company Uploaded All Primary Data)
  const freshProject = await projectsColl.findOne({ _id: projectId });
  const currentNext =
    typeof freshProject?.next_activities_id === 'number'
      ? freshProject.next_activities_id
      : 0;
  if (currentNext < 11) {
    await projectsColl.updateOne(
      { _id: projectId },
      { $set: { next_activities_id: 11, updatedAt: now } },
    );
    console.log('next_activities_id advanced to 11 (Company Uploaded All Primary Data).');
  }

  // Log activity (same intent as service submitPrimaryData)
  await activitiesColl.insertOne({
    company_id: companyId,
    project_id: projectId,
    description: 'Company has submitted the Primary Form Data',
    activity_type: 'company',
    milestone_flow: 11,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Activity logged: Company has submitted the Primary Form Data (milestone 11).');

  // Notification to company
  await notificationsColl.insertOne({
    title: 'Primary Data Submitted',
    content: 'Your Primary Data form has been submitted successfully. GreenCo Team will review it.',
    notify_type: 'C',
    user_id: companyId,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Notification created for company (Primary Data Submitted).');

  await client.close();
  console.log('\nDone. Primary Data submitted for project', projectIdRaw);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

