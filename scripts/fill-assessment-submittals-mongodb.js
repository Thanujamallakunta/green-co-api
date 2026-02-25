/**
 * Fill Assessment Submittals data for a project (MongoDB script).
 * Inserts rows into companyresourcedocuments with document_type: 'assessment_submittal',
 * advances next_activities_id to 13, and creates a notification for the company.
 *
 * Usage:
 *   node scripts/fill-assessment-submittals-mongodb.js <projectId> [path-to.json]
 *
 * If JSON path is omitted, uses 9 category items (GSC, IE, PSL, MS, EM, CBM, WTM, MRM, GBE)
 * so each tab has data. description must match the tab code for the frontend to show it under that tab.
 *
 * JSON format (optional):
 * {
 *   "projectId": "699dec95067fd70f4293d548",
 *   "companyId": "optional-override",
 *   "advance_step": true,
 *   "send_notification": true,
 *   "items": [
 *     { "document_title": "Green Supply Chain", "description": "GSC" },
 *     { "document_title": "Industrial Ecology", "description": "IE" },
 *     ... (PSL, MS, EM, CBM, WTM, MRM, GBE)
 *   ]
 * }
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// One per tab (GSC, IE, PSL, MS, EM, CBM, WTM, MRM, GBE) – description = category code so frontend shows doc under that tab
const DEFAULT_ITEMS = [
  { document_title: 'Green Supply Chain', description: 'GSC' },
  { document_title: 'Industrial Ecology', description: 'IE' },
  { document_title: 'Product Stewardship / Life Cycle', description: 'PSL' },
  { document_title: 'Material Stewardship', description: 'MS' },
  { document_title: 'Energy Management', description: 'EM' },
  { document_title: 'Circular Business Model', description: 'CBM' },
  { document_title: 'Water & Wastewater Management', description: 'WTM' },
  { document_title: 'Material Resource Management', description: 'MRM' },
  { document_title: 'Green Building / Infrastructure', description: 'GBE' },
];

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
  const projectId = process.argv[2];
  const jsonPath = process.argv[3];

  if (!projectId) {
    console.error('Usage: node scripts/fill-assessment-submittals-mongodb.js <projectId> [path-to.json]');
    console.error('Example: node scripts/fill-assessment-submittals-mongodb.js 699dec95067fd70f4293d548');
    process.exit(1);
  }

  let items = DEFAULT_ITEMS;
  let companyIdOverride = null;
  let advanceStep = true;
  let sendNotification = true;

  if (jsonPath) {
    const resolved = path.resolve(process.cwd(), jsonPath);
    if (!fs.existsSync(resolved)) {
      console.error('File not found:', resolved);
      process.exit(1);
    }
    try {
      const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      if (data.projectId && data.projectId !== projectId) {
        console.warn('Warning: projectId in JSON differs from argument; using argument:', projectId);
      }
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        items = data.items;
      }
      if (data.companyId) companyIdOverride = data.companyId;
      if (typeof data.advance_step === 'boolean') advanceStep = data.advance_step;
      if (typeof data.send_notification === 'boolean') sendNotification = data.send_notification;
    } catch (e) {
      console.error('Invalid JSON:', e.message);
      process.exit(1);
    }
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const resourceColl = db.collection('companyresourcedocuments');
  const notificationsColl = db.collection('notifications');

  const project = await projectsColl.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = companyIdOverride ? new ObjectId(companyIdOverride) : project.company_id;
  const pId = new ObjectId(projectId);

  let inserted = 0;
  const now = new Date();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.document_title || item.title || `Assessment Submittal ${i + 1}`;
    const description = item.description || item.criterion_name || title;
    const filename = item.document_filename || `assessment-submittal-${i + 1}.pdf`;
    const fullUrl = `${API_BASE_URL}/uploads/resources/${projectId}/${filename}`;

    const doc = {
      company_id: companyId,
      project_id: pId,
      document_url: fullUrl,
      document_filename: filename,
      document_title: title,
      document_type: 'assessment_submittal',
      description,
      document_status: item.document_status ?? 0,
      document_remarks: item.document_remarks ?? null,
      criteria_id: item.criteria_id ? new ObjectId(item.criteria_id) : null,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    };

    await resourceColl.insertOne(doc);
    inserted++;
  }

  if (advanceStep) {
    const currentNext = project.next_activities_id ?? 0;
    if (currentNext < 13) {
      await projectsColl.updateOne(
        { _id: pId },
        { $set: { next_activities_id: 13, updatedAt: now } },
      );
      console.log('Advanced project next_activities_id to 13 (All Assessment Documents Uploaded by Company).');
    }
  }

  if (sendNotification) {
    await notificationsColl.insertOne({
      title: 'Assessment Submittals Completed',
      content: 'All assessment submittal documents have been uploaded for your project (all 9 categories). GreenCo Team will review them.',
      notify_type: 'C',
      user_id: companyId,
      seen: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Notification created for company.');
    await projectsColl.updateOne(
      { _id: pId },
      { $set: { assessment_submittals_complete_notified: true, updatedAt: now } },
    );
    console.log('Set assessment_submittals_complete_notified on project (so API will not send duplicate when uploading via UI).');
  }

  await client.close();
  console.log('');
  console.log('Done. Assessment submittal documents inserted:', inserted);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
