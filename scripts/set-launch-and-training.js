/**
 * Set Launch and Training (Site Visit Report) on a project in MongoDB.
 * Updates: companyprojects.launch_training_document, companyprojects.launch_training_report_date
 *
 * Usage:
 *   node scripts/set-launch-and-training.js <projectId> [documentPath] [reportDate]
 *
 * Examples:
 *   # Show current values for project
 *   node scripts/set-launch-and-training.js 6994af7e1c64cedc200bd8ca
 *
 *   # Set document path and date (path relative to app root, e.g. uploads/...)
 *   node scripts/set-launch-and-training.js 6994af7e1c64cedc200bd8ca "uploads/companyproject/launchAndTraining/6994af7e1c64cedc200bd8c8/20250221120000_Report.pdf" 2025-02-21
 *
 *   # Set using just filename – script builds path as uploads/companyproject/launchAndTraining/{company_id}/{filename}
 *   node scripts/set-launch-and-training.js 6994af7e1c64cedc200bd8ca Site_Visit_Report.pdf 2025-02-21
 *
 * reportDate: YYYY-MM-DD or ISO string. If omitted when setting path, only document is updated.
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const args = process.argv.slice(2);
const projectId = args[0];
const documentPath = args[1];
const reportDateStr = args[2];

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
  if (!projectId) {
    console.error('Usage: node scripts/set-launch-and-training.js <projectId> [documentPath] [reportDate]');
    console.error('Example: node scripts/set-launch-and-training.js 6994af7e1c64cedc200bd8ca "uploads/companyproject/launchAndTraining/COMPANY_ID/Report.pdf" 2025-02-21');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('companyprojects');
  const activitiesColl = db.collection('companyactivities');
  const notificationsColl = db.collection('notifications');

  const project = await coll.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = (project.company_id && project.company_id.toString)
    ? project.company_id.toString()
    : String(project.company_id || '');

  if (!documentPath) {
    console.log('Project:', projectId);
    console.log('Company ID:', companyId);
    console.log('launch_training_document:', project.launch_training_document ?? null);
    console.log('launch_training_report_date:', project.launch_training_report_date ?? null);
    await client.close();
    return;
  }

  let pathToSet = documentPath;
  if (!documentPath.includes('/') || !documentPath.startsWith('uploads/')) {
    pathToSet = `uploads/companyproject/launchAndTraining/${companyId}/${documentPath}`;
    console.log('Using path:', pathToSet);
  }

  const update = { launch_training_document: pathToSet };
  if (reportDateStr) {
    const d = new Date(reportDateStr);
    if (isNaN(d.getTime())) {
      console.error('Invalid date:', reportDateStr, '- use YYYY-MM-DD');
      process.exit(1);
    }
    update.launch_training_report_date = d;
  }

  const result = await coll.updateOne(
    { _id: new ObjectId(projectId) },
    { $set: update },
  );

  if (result.matchedCount === 0) {
    console.error('Project not found for update');
    process.exit(1);
  }

  const now = new Date();

  // Log activity 63 (Consultant Uploaded Site Visit Report) if not already present
  const existingActivity = await activitiesColl.findOne({
    company_id: project.company_id,
    project_id: new ObjectId(projectId),
    milestone_flow: 63,
  });
  if (!existingActivity) {
    await activitiesColl.insertOne({
      company_id: project.company_id,
      project_id: new ObjectId(projectId),
      description: 'Consultant Uploaded Site Visit Report',
      activity_type: 'company',
      milestone_flow: 63,
      milestone_completed: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Activity logged: Consultant Uploaded Site Visit Report (milestone 63)');
  } else {
    console.log('Activity for milestone 63 already exists – not inserting duplicate.');
  }

  // Update next_activities_id to 64
  await coll.updateOne(
    { _id: new ObjectId(projectId) },
    { $set: { next_activities_id: 64, updatedAt: now } },
  );

  // Create notification for company (C)
  await notificationsColl.insertOne({
    title: 'Site Visit Report uploaded',
    content:
      'The Site Visit Report (Launch & Training) has been uploaded for your project. You can view it in the portal.',
    notify_type: 'C',
    user_id: project.company_id,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Notification created for company about Site Visit Report upload.');

  console.log('Updated project', projectId);
  console.log('  launch_training_document:', pathToSet);
  if (reportDateStr)
    console.log(
      '  launch_training_report_date:',
      update.launch_training_report_date.toISOString().slice(0, 10),
    );
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
