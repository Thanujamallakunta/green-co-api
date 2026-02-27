/**
 * Upload certificate PDF via script: copy a local PDF to uploads and
 * update the project with certificate info + activity + next step.
 *
 * Mirrors the behaviour of the API:
 *   POST /api/company/projects/:projectId/certificate-upload
 *
 * Saves to: uploads/company_certificate/{projectId}/{filename}
 * Updates:  companyprojects.certificate_* fields
 * Logs:     milestone 18 \"CII Uploaded Certificate\"
 * Advances: next_activities_id to 19 (\"2nd Invoice uploaded\")
 *
 * Usage:
 *   node scripts/upload-certificate-mongodb.js <projectId> <pathToPdf>
 *
 * Example:
 *   node scripts/upload-certificate-mongodb.js 699ea4b08976cf56e00396f9 ./certificate.pdf
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

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
  const pathToPdf = process.argv[3];

  if (!projectIdRaw || !pathToPdf) {
    console.error('Usage: node scripts/upload-certificate-mongodb.js <projectId> <pathToPdf>');
    console.error('  projectId  = 24-char Mongo ObjectId of company project');
    console.error('  pathToPdf = path to certificate PDF (local file)');
    process.exit(1);
  }

  if (projectIdRaw.length !== 24 || !/^[a-f0-9]+$/i.test(projectIdRaw)) {
    console.error('projectId must be a 24-character hex string (Mongo ObjectId).');
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(pathToPdf) ? pathToPdf : path.join(process.cwd(), pathToPdf);
  if (!fs.existsSync(absolutePath)) {
    console.error('File not found:', absolutePath);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);

  const projectId = new ObjectId(projectIdRaw);
  const project = await db.collection('companyprojects').findOne({ _id: projectId });
  if (!project) {
    console.error('Project not found:', projectIdRaw);
    await client.close();
    process.exit(1);
  }

  const companyId = project.company_id;
  const uploadDir = path.join(process.cwd(), 'uploads', 'company_certificate', projectIdRaw);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created directory:', uploadDir);
  }

  const ext = path.extname(absolutePath) || '.pdf';
  const filename = `certificate-${Date.now()}${ext}`;
  const destPath = path.join(uploadDir, filename);
  fs.copyFileSync(absolutePath, destPath);
  const relativePath = `uploads/company_certificate/${projectIdRaw}/${filename}`;
  console.log('Copied certificate to:', relativePath);

  const now = new Date();
  const expiry = new Date(now.getTime());
  expiry.setFullYear(expiry.getFullYear() + 3);

  await db.collection('companyprojects').updateOne(
    { _id: projectId },
    {
      $set: {
        certificate_document_url: relativePath,
        certificate_document_filename: path.basename(absolutePath),
        certificate_upload_date: now,
        certificate_expiry_date: expiry,
        updatedAt: now,
      },
    },
  );
  console.log('Project updated with certificate details.');

  // Log milestone 18 – CII Uploaded Certificate
  await db.collection('companyactivities').insertOne({
    company_id: companyId,
    project_id: projectId,
    description: 'CII Uploaded Certificate',
    activity_type: 'cii',
    milestone_flow: 18,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Activity logged: CII Uploaded Certificate (milestone 18).');

  // Advance next_activities_id to at least 19 (2nd Invoice uploaded)
  const freshProject = await db.collection('companyprojects').findOne({ _id: projectId });
  const currentNext =
    typeof freshProject?.next_activities_id === 'number' ? freshProject.next_activities_id : 0;
  if (currentNext < 19) {
    await db.collection('companyprojects').updateOne(
      { _id: projectId },
      { $set: { next_activities_id: 19, updatedAt: now } },
    );
    console.log('next_activities_id advanced to 19 (2nd Invoice uploaded).');
  } else {
    console.log('next_activities_id already >= 19; not changed.');
  }

  console.log('\nDone. Certificate document path:', relativePath);
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

