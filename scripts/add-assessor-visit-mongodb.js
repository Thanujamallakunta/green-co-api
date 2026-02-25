/**
 * Add Assessor Visit Schedule Details via MongoDB (same data as "Assessor Visit Details" in the UI).
 * Creates/updates companyassessors (company_id, project_id, assessor_id, visit_dates),
 * advances next_activities_id to 14 so Certificate tab opens, and creates notifications for company and assessor.
 *
 * Usage:
 *   node scripts/add-assessor-visit-mongodb.js <projectId> <assessorEmail> [visitDate]
 *   node scripts/add-assessor-visit-mongodb.js <path-to.json>
 *
 * Examples:
 *   node scripts/add-assessor-visit-mongodb.js 699dec95067fd70f4293d548 naveenqa@yopmail.com 22-02-2026
 *   node scripts/add-assessor-visit-mongodb.js 699dec95067fd70f4293d548 naveenqa@yopmail.com
 *
 * JSON format (optional):
 * {
 *   "projectId": "699dec95067fd70f4293d548",
 *   "assessorEmail": "naveenqa@yopmail.com",
 *   "assessorName": "NAVEEN",
 *   "visitDate": "22-02-2026",
 *   "advance_step": true,
 *   "send_notification": true
 * }
 * visitDate can be DD-MM-YYYY or YYYY-MM-DD (stored as YYYY-MM-DD).
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco_db';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco_db');
  }
}

/** Normalize date to YYYY-MM-DD for storage (accepts DD-MM-YYYY or YYYY-MM-DD) */
function toYYYYMMDD(s) {
  if (!s || typeof s !== 'string') return new Date().toISOString().slice(0, 10);
  const trimmed = s.trim();
  const ddmmyy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyy) return `${ddmmyy[3]}-${ddmmyy[2].padStart(2, '0')}-${ddmmyy[1].padStart(2, '0')}`;
  const yyyymmdd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
  return new Date().toISOString().slice(0, 10);
}

async function run() {
  let projectId, assessorEmail, assessorName, visitDate, advanceStep = true, sendNotification = true;

  const arg1 = process.argv[2];
  if (!arg1) {
    console.error('Usage: node scripts/add-assessor-visit-mongodb.js <projectId> <assessorEmail> [visitDate]');
    console.error('   Or: node scripts/add-assessor-visit-mongodb.js <path-to.json>');
    process.exit(1);
  }

  if (arg1.endsWith('.json')) {
    const resolved = path.resolve(process.cwd(), arg1);
    if (!fs.existsSync(resolved)) {
      console.error('File not found:', resolved);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    projectId = data.projectId || data.project_id;
    assessorEmail = data.assessorEmail || data.assessor_email;
    assessorName = data.assessorName || data.assessor_name || 'Assessor';
    visitDate = toYYYYMMDD(data.visitDate || data.visit_date);
    if (typeof data.advance_step === 'boolean') advanceStep = data.advance_step;
    if (typeof data.send_notification === 'boolean') sendNotification = data.send_notification;
  } else {
    projectId = arg1;
    const args = process.argv.slice(3).filter((a) => !a.startsWith('--name='));
    const nameArg = process.argv.slice(3).find((a) => a.startsWith('--name='));
    if (nameArg) assessorName = nameArg.replace(/^--name=/, '');
    assessorEmail = args[0];
    visitDate = toYYYYMMDD(args[1]);
    if (!assessorEmail) {
      console.error('Usage: node scripts/add-assessor-visit-mongodb.js <projectId> <assessorEmail> [visitDate] [--name=NAVEEN]');
      process.exit(1);
    }
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const assessorsColl = db.collection('assessors');
  const companyAssessorsColl = db.collection('companyassessors');
  const notificationsColl = db.collection('notifications');

  const project = await projectsColl.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = project.company_id;
  const pId = new ObjectId(projectId);

  let assessor = await assessorsColl.findOne({ email: (assessorEmail || '').toLowerCase().trim() });
  if (!assessor) {
    const name = assessorName || assessorEmail.split('@')[0] || 'Assessor';
    const res = await assessorsColl.insertOne({
      name,
      email: assessorEmail.toLowerCase().trim(),
      status: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assessor = await assessorsColl.findOne({ _id: res.insertedId });
    console.log('Created assessor:', name, assessorEmail);
  }

  const assessorId = assessor._id;
  const visit_dates = [visitDate];

  await companyAssessorsColl.updateOne(
    { company_id: companyId, project_id: pId, assessor_id: assessorId },
    { $set: { visit_dates, updatedAt: new Date() } },
    { upsert: true },
  );
  console.log('Assessor visit details set: project', projectId, 'assessor', assessor.email, 'visit', visitDate);

  if (advanceStep) {
    const currentNext = project.next_activities_id ?? 0;
    if (currentNext < 14) {
      await projectsColl.updateOne(
        { _id: pId },
        { $set: { next_activities_id: 14, updatedAt: new Date() } },
      );
      console.log('Advanced project next_activities_id to 14 (Certificate tab will open).');
    }
  }

  if (sendNotification) {
    const now = new Date();
    const assessorNameStr = assessor.name || 'Assessor';
    await notificationsColl.insertOne({
      title: 'Assessor Visit Schedule Details Added',
      content: `GreenCo Team has assigned an Assessor for your project. ${assessorNameStr} (${assessor.email}) – Site Visit Date: ${visitDate}. Check Assessor Visit Details.`,
      notify_type: 'C',
      user_id: companyId,
      seen: false,
      createdAt: now,
      updatedAt: now,
    });
    await notificationsColl.insertOne({
      title: 'You have been assigned as Assessor',
      content: `You have been assigned to a company project. Site Visit Date: ${visitDate}.`,
      notify_type: 'AS',
      user_id: assessorId,
      seen: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Notifications created for company (C) and assessor (AS).');
  }

  await client.close();
  console.log('');
  console.log('Done. Assessor visit details added. Name:', assessor.name, '| Email:', assessor.email, '| Site Visit Date:', visitDate);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
