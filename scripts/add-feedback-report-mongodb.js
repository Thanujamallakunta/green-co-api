/**
 * Add Feedback Report via MongoDB (same as feedback-upload via API).
 * Copies a PDF to uploads/company_feedback/{projectId}/, updates companyprojects with
 * feedback_document_url, feedback_upload_date, next_activities_id = 24, and creates
 * activity + notification.
 *
 * Usage:
 *   node scripts/add-feedback-report-mongodb.js <projectId> [--feedback=path/to/feedback.pdf]
 *   node scripts/add-feedback-report-mongodb.js <path-to.json>
 *
 * Examples:
 *   node scripts/add-feedback-report-mongodb.js 699dec95067fd70f4293d548
 *   node scripts/add-feedback-report-mongodb.js 699dec95067fd70f4293d548 --feedback=uploads/company_feedback/6994af7e1c64cedc200bd8ca/feedback.pdf
 *
 * If --feedback is omitted, uses uploads/company_feedback/6994af7e1c64cedc200bd8ca/feedback.pdf if it exists.
 *
 * JSON format (optional):
 * { "projectId": "...", "feedback_path": "path/to/feedback.pdf", "advance_step": true, "send_notification": true }
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const DEFAULT_FEEDBACK_SOURCE = 'uploads/company_feedback/6994af7e1c64cedc200bd8ca/feedback.pdf';

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
  let projectId = process.argv[2];
  let feedback_path = process.argv.find((a) => a.startsWith('--feedback='))
    ? process.argv.find((a) => a.startsWith('--feedback=')).replace(/^--feedback=/, '')
    : null;
  let advance_step = true;
  let send_notification = true;

  if (projectId && projectId.endsWith('.json')) {
    const resolved = path.resolve(process.cwd(), projectId);
    if (!fs.existsSync(resolved)) {
      console.error('File not found:', resolved);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    projectId = data.projectId || data.project_id;
    if (data.feedback_path) feedback_path = data.feedback_path;
    if (typeof data.advance_step === 'boolean') advance_step = data.advance_step;
    if (typeof data.send_notification === 'boolean') send_notification = data.send_notification;
  }

  if (!projectId) {
    console.error('Usage: node scripts/add-feedback-report-mongodb.js <projectId> [--feedback=path/to/feedback.pdf]');
    process.exit(1);
  }
  if (!/^[a-f0-9]{24}$/i.test(projectId)) {
    console.error('Error: projectId must be a 24-character hex string. Got:', projectId.length, 'chars.');
    process.exit(1);
  }

  let sourcePdf = feedback_path ? path.resolve(process.cwd(), feedback_path) : path.resolve(process.cwd(), DEFAULT_FEEDBACK_SOURCE);
  if (!fs.existsSync(sourcePdf)) {
    console.error('Feedback PDF not found:', sourcePdf);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const activitiesColl = db.collection('companyactivities');
  const notificationsColl = db.collection('notifications');

  const project = await projectsColl.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = project.company_id;
  const pId = new ObjectId(projectId);
  const now = new Date();

  const uploadsDir = path.join(process.cwd(), 'uploads', 'company_feedback', projectId);
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = 'feedback.pdf';
  const destPath = path.join(uploadsDir, filename);
  fs.copyFileSync(sourcePdf, destPath);
  const relativePath = `uploads/company_feedback/${projectId}/${filename}`;

  const update = {
    feedback_document_url: relativePath,
    feedback_document_filename: filename,
    feedback_upload_date: now,
    updatedAt: now,
  };
  if (advance_step) {
    update.next_activities_id = 24;
  }

  await projectsColl.updateOne({ _id: pId }, { $set: update });

  await activitiesColl.insertOne({
    company_id: companyId,
    project_id: pId,
    description: 'CII Uploaded Feedback Report',
    activity_type: 'cii',
    milestone_flow: 23,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });

  if (send_notification) {
    await notificationsColl.insertOne({
      title: 'Feedback Report Uploaded',
      content: 'GreenCo Team has uploaded the Feedback Report for your project. You can download it from the View Certificate / Feedback section.',
      notify_type: 'C',
      user_id: companyId,
      seen: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Notification created for company.');
  }

  await client.close();
  console.log('');
  console.log('Done. Feedback report added:');
  console.log('  feedback_document_url:', relativePath);
  console.log('  next_activities_id:', advance_step ? 24 : '(unchanged)');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
