/**
 * Approve work order document directly by project ID only.
 * Finds the work order by project_id, sets wo_status = 1 (Approved), updates project
 * next_activities_id, logs activity, and creates an in-app notification for the company.
 *
 * Usage:
 *   node scripts/approve-work-order-direct.js <projectId>
 *
 * Example:
 *   node scripts/approve-work-order-direct.js 6994af7e1c64cedc200bd8ca
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
function getDbName() {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    return (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco';
  } catch (_) {
    return 'greenco';
  }
}

async function run() {
  const projectIdRaw = process.argv[2];
  if (!projectIdRaw || projectIdRaw.length !== 24 || !/^[a-f0-9]+$/i.test(projectIdRaw)) {
    console.error('Usage: node scripts/approve-work-order-direct.js <projectId>');
    console.error('  projectId = 24-char hex MongoDB ObjectId of the company project');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const dbName = getDbName();
  console.log('Using DB:', dbName, '| MONGODB_URI from .env:', !!process.env.MONGODB_URI);

  const projectsColl = db.collection('companyprojects');
  const workOrdersColl = db.collection('companyworkorders');
  const activitiesColl = db.collection('companyactivities');
  const notificationsColl = db.collection('notifications');

  const projectIdObj = new ObjectId(projectIdRaw);

  const project = await projectsColl.findOne({ _id: projectIdObj });
  if (!project) {
    console.error('Project not found:', projectIdRaw);
    await client.close();
    process.exit(1);
  }

  // Latest work order for this project (same as API)
  const workOrder = await workOrdersColl.findOne(
    { project_id: projectIdObj },
    { sort: { createdAt: -1 } }
  );
  if (!workOrder) {
    console.error('No work order found for this project. Create one first (e.g. set-proposal-workorder-projectcode.js).');
    await client.close();
    process.exit(1);
  }

  const companyId = workOrder.company_id;
  const now = new Date();

  // 1) Approve work order
  await workOrdersColl.updateOne(
    { _id: workOrder._id },
    {
      $set: {
        wo_status: 1,
        wo_remarks: null,
        wo_doc_status_updated_at: now,
        updatedAt: now,
      },
    }
  );
  console.log('Work order approved (wo_status = 1).');

  // 2) Update project next_activities_id to 6
  await projectsColl.updateOne(
    { _id: projectIdObj },
    { $set: { next_activities_id: 6, updatedAt: now } }
  );
  console.log('Project next_activities_id set to 6.');

  // 3) Generate reg_id on company if not exists
  const companiesColl = db.collection('companies');
  const company = await companiesColl.findOne({ _id: companyId });
  if (company && !company.reg_id) {
    const regId = `REG${Date.now()}`;
    await companiesColl.updateOne(
      { _id: companyId },
      { $set: { reg_id: regId, updatedAt: now } }
    );
    console.log('Generated reg_id:', regId);
  }

  // 4) Log activity (milestone 5)
  const hasMilestone5 = await activitiesColl.findOne({
    company_id: companyId,
    project_id: projectIdObj,
    milestone_flow: 5,
  });
  if (!hasMilestone5) {
    await activitiesColl.insertOne({
      company_id: companyId,
      project_id: projectIdObj,
      description: 'CII Approved Work Order Document',
      activity_type: 'cii',
      milestone_flow: 5,
      milestone_completed: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Activity logged: CII Approved Work Order Document (milestone 5).');
  }

  // 5) In-app notification for company
  const projectCode = project.project_id || projectIdRaw;
  await notificationsColl.insertOne({
    title: 'Work order approved',
    content: `Your work order has been approved by CII for project ${projectCode}. You can proceed to the next step.`,
    notify_type: 'C',
    user_id: companyId,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Notification created for company (C).');

  const updated = await workOrdersColl.findOne({ _id: workOrder._id });
  console.log('\nDone. Work order status:', updated.wo_status, '(1 = Approved)');
  console.log('Refresh the app; if still Under Review, ensure the app uses the same DB:', dbName);
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
