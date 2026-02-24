/**
 * Sync certificate and feedback document paths in MongoDB to match files on disk.
 * Use when you've placed PDFs in uploads/company_certificate/{projectId}/ and
 * uploads/company_feedback/{projectId}/ but the API still returns 404 (DB has no paths).
 *
 * Usage:
 *   node scripts/sync-certificate-feedback-paths.js [projectId]
 *   node scripts/sync-certificate-feedback-paths.js                    # sync all projects that have files
 *
 * Examples:
 *   node scripts/sync-certificate-feedback-paths.js 6994af7e1c64cedc200bd8ca
 *   node scripts/sync-certificate-feedback-paths.js
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco');
  }
}

function getFirstFile(dir) {
  if (!fs.existsSync(dir)) return null;
  const names = fs.readdirSync(dir);
  const file = names.find((n) => !fs.statSync(path.join(dir, n)).isDirectory());
  return file || null;
}

async function run() {
  const projectIdArg = process.argv[2];
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('companyprojects');

  let projectIds = [];
  if (projectIdArg) {
    try {
      projectIds = [new ObjectId(projectIdArg)];
    } catch (_) {
      projectIds = [projectIdArg];
    }
  } else {
    const certDir = path.join(UPLOADS_ROOT, 'company_certificate');
    const feedbackDir = path.join(UPLOADS_ROOT, 'company_feedback');
    const ids = new Set();
    if (fs.existsSync(certDir)) {
      fs.readdirSync(certDir).forEach((id) => {
        const full = path.join(certDir, id);
        if (fs.statSync(full).isDirectory()) ids.add(id);
      });
    }
    if (fs.existsSync(feedbackDir)) {
      fs.readdirSync(feedbackDir).forEach((id) => {
        const full = path.join(feedbackDir, id);
        if (fs.statSync(full).isDirectory()) ids.add(id);
      });
    }
    projectIds = Array.from(ids);
  }

  if (projectIds.length === 0) {
    console.log('No project IDs to sync. Place files in uploads/company_certificate/<projectId>/ and uploads/company_feedback/<projectId>/ or pass projectId.');
    await client.close();
    process.exit(0);
  }

  let updated = 0;
  for (const pid of projectIds) {
    const certDir = path.join(UPLOADS_ROOT, 'company_certificate', pid.toString());
    const feedbackDir = path.join(UPLOADS_ROOT, 'company_feedback', pid.toString());
    const certFile = getFirstFile(certDir);
    const feedbackFile = getFirstFile(feedbackDir);

    const update = {};
    if (certFile) {
      update.certificate_document_url = `uploads/company_certificate/${pid}/${certFile}`;
      update.certificate_document_filename = certFile;
    }
    if (feedbackFile) {
      update.feedback_document_url = `uploads/company_feedback/${pid}/${feedbackFile}`;
      update.feedback_document_filename = feedbackFile;
    }
    if (Object.keys(update).length === 0) continue;

    let id = pid;
    try {
      id = typeof pid === 'string' ? new ObjectId(pid) : pid;
    } catch (_) {}

    const result = await coll.updateOne({ _id: id }, { $set: update });
    if (result.modifiedCount || result.matchedCount) {
      updated++;
      console.log('Updated project', pid, update);
    }
  }

  console.log('Done. Updated', updated, 'project(s). GET certificate and certificate-document/feedback-document should now return/serve the files.');
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
