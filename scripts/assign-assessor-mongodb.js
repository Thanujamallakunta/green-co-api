/**
 * Assign an assessor to a project (Assessor Visit Details).
 * Creates a CompanyAssessor record so GET quickview returns data.companies_assessors
 * (Name, Email, Site Visit Date) for the "Assessor Visit Schedule Details" card.
 *
 * Usage:
 *   node scripts/assign-assessor-mongodb.js <projectId> [assessorId] [visitDate1] [visitDate2] ...
 *
 * visitDate: YYYY-MM-DD (e.g. 2026-02-20). If omitted, uses today.
 * If assessorId is omitted, uses the first assessor in DB or creates a default one.
 *
 * Examples:
 *   node scripts/assign-assessor-mongodb.js 6994af7e1c64cedc200bd8ca
 *   node scripts/assign-assessor-mongodb.js 6994af7e1c64cedc200bd8ca 674a1b2c3d4e5f6789012345 2026-02-20 2026-02-21
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
  const projectId = process.argv[2];
  let assessorId = process.argv[3];
  const dateArgs = process.argv.slice(4);

  if (!projectId) {
    console.error('Usage: node scripts/assign-assessor-mongodb.js <projectId> [assessorId] [visitDate1] [visitDate2] ...');
    console.error('Example: node scripts/assign-assessor-mongodb.js 6994af7e1c64cedc200bd8ca 674a1b2c3d4e5f6789012345 2026-02-20');
    process.exit(1);
  }

  // If first optional arg looks like a date (YYYY-MM-DD), treat as date not assessorId
  if (assessorId && /^\d{4}-\d{2}-\d{2}$/.test(assessorId)) {
    dateArgs.unshift(assessorId);
    assessorId = null;
  }

  const visitDates = dateArgs.length > 0 ? dateArgs : [new Date().toISOString().slice(0, 10)];

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const assessorsColl = db.collection('assessors');
  const companyAssessorsColl = db.collection('companyassessors');
  const activitiesColl = db.collection('companyactivities');
  const notificationsColl = db.collection('notifications');

  const project = await projectsColl.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = project.company_id;
  let assessor;

  if (assessorId) {
    try {
      assessor = await assessorsColl.findOne({ _id: new ObjectId(assessorId) });
    } catch (_) {
      console.error('Invalid assessorId:', assessorId);
      process.exit(1);
    }
    if (!assessor) {
      console.error('Assessor not found:', assessorId);
      process.exit(1);
    }
  } else {
    assessor = await assessorsColl.findOne({});
    if (!assessor) {
      const result = await assessorsColl.insertOne({
        name: 'NAVEEN',
        email: 'naveenqa@yopmail.com',
        status: '1',
      });
      assessor = await assessorsColl.findOne({ _id: result.insertedId });
      console.log('Created default assessor:', assessor.name, assessor.email);
    }
  }

  const existing = await companyAssessorsColl.findOne({
    company_id: companyId,
    project_id: new ObjectId(projectId),
    assessor_id: assessor._id,
  });

  if (existing) {
    await companyAssessorsColl.updateOne(
      { _id: existing._id },
      { $set: { visit_dates: visitDates, updatedAt: new Date() } },
    );
    console.log('Updated existing assignation – visit_dates:', visitDates.join(', '));
  } else {
    await companyAssessorsColl.insertOne({
      company_id: companyId,
      project_id: new ObjectId(projectId),
      assessor_id: assessor._id,
      visit_dates: visitDates,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Assessor assigned successfully.');
  }

  const now = new Date();
  const pId = new ObjectId(projectId);

  // Log milestone 15: CII Assigned an Assessor (so "Next Step" moves to 16)
  await activitiesColl.insertOne({
    company_id: companyId,
    project_id: pId,
    description: 'CII Assigned an Assessor',
    activity_type: 'cii',
    milestone_flow: 15,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Activity logged: CII Assigned an Assessor (milestone 15).');

  const currentNext = typeof project.next_activities_id === 'number' ? project.next_activities_id : 0;
  if (currentNext < 16) {
    await projectsColl.updateOne(
      { _id: pId },
      { $set: { next_activities_id: 16, updatedAt: now } },
    );
    console.log('next_activities_id advanced to 16 (Preliminary Scoring submitted by CII).');
  }

  await notificationsColl.insertOne({
    title: 'GreenCo Team has assigned an Assessor for your project',
    content: `Assessor ${assessor.name} has been assigned for your project by GreenCo Team. Check site visit details.`,
    notify_type: 'C',
    user_id: companyId,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  await notificationsColl.insertOne({
    title: 'Greenco Team has assigned an Assessor for your company',
    content: `Assessor ${assessor.name} has been assigned to this company by Admin`,
    notify_type: 'AS',
    user_id: assessor._id,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Notifications created for company (C) and assessor (AS).');

  console.log('  Project ID:', projectId);
  console.log('  Company ID:', companyId.toString());
  console.log('  Assessor:', assessor.name, assessor.email);
  console.log('  Visit dates:', visitDates.join(', '));
  console.log('');
  console.log('GET api/company/projects/' + projectId + '/quickview will return this in data.companies_assessors');
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
