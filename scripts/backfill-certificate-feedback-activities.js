/**
 * Backfill Certificate + Feedback activities so Quick View shows the correct latest step.
 *
 * Use this when certificates / feedback reports were uploaded BEFORE
 * we started logging CompanyActivity for them.
 *
 * What it does:
 * - For each project in `companyprojects`:
 *   - If it has `certificate_document_url` and NO activity with milestone_flow = 18,
 *     it inserts: "CII Uploaded Certificate" (milestone 18, completed).
 *   - If it has `feedback_document_url` and NO activity with milestone_flow = 23,
 *     it inserts: "CII Uploaded Feedback Report" (milestone 23, completed).
 * - Uses `certificate_upload_date` / `feedback_upload_date` as createdAt when available,
 *   otherwise uses `new Date()` (now).
 *
 * Usage (from project root):
 *   node scripts/backfill-certificate-feedback-activities.js                     # all projects
 *   node scripts/backfill-certificate-feedback-activities.js <projectId>         # one project by _id
 *   node scripts/backfill-certificate-feedback-activities.js --company <companyId>  # all projects for company
 *
 * Example (by company id – no need to look up project_mongo_id):
 *   node scripts/backfill-certificate-feedback-activities.js --company 6994af7e1c64cedc200bd8ca
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
  const arg = process.argv[2];
  const arg2 = process.argv[3];
  const byCompany = arg === '--company' && arg2;
  const companyIdRaw = byCompany ? arg2 : null;
  const projectIdRaw = byCompany ? null : arg;

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const activitiesColl = db.collection('companyactivities');

  let cursor;
  if (byCompany && companyIdRaw) {
    let companyIdObj = null;
    try {
      companyIdObj = new ObjectId(companyIdRaw);
    } catch (_) {}
    // company_id can be stored as ObjectId or string in Mongo
    const countById = companyIdObj ? await projectsColl.countDocuments({ company_id: companyIdObj }) : 0;
    const countByStr = await projectsColl.countDocuments({ company_id: companyIdRaw });
    const count = countById || countByStr;
    if (count === 0) {
      const total = await projectsColl.countDocuments({});
      const sample = await projectsColl.findOne({}, { projection: { company_id: 1, _id: 1 } });
      console.log('No projects found for company_id:', companyIdRaw);
      console.log('DB has', total, 'total project(s). Sample company_id:', sample ? (sample.company_id && sample.company_id.toString ? sample.company_id.toString() : sample.company_id) : 'N/A');
      console.log('Check: .env MONGODB_URI may point to a different DB than the one your app uses.');
      await client.close();
      process.exit(1);
    }
    console.log('Found', count, 'project(s) for company. Backfilling certificate/feedback activities...');
    const companyQuery = countById ? { company_id: companyIdObj } : { company_id: companyIdRaw };
    cursor = projectsColl.find(companyQuery);
  } else if (projectIdRaw) {
    let id = projectIdRaw;
    try {
      id = new ObjectId(projectIdRaw);
    } catch (_) {}
    const one = await projectsColl.findOne({ _id: id });
    if (!one) {
      console.log('Project not found with _id:', projectIdRaw);
      console.log('Tip: use --company <companyId> to backfill by company: node scripts/backfill-certificate-feedback-activities.js --company 6994af7e1c64cedc200bd8ca');
      await client.close();
      process.exit(1);
    }
    const hasCert = one.certificate_document_url && String(one.certificate_document_url).trim() !== '';
    const hasFeedback = one.feedback_document_url && String(one.feedback_document_url).trim() !== '';
    if (!hasCert && !hasFeedback) {
      console.log('Project found but has no certificate_document_url or feedback_document_url set.');
      console.log('  certificate_document_url:', one.certificate_document_url || '(missing/empty)');
      console.log('  feedback_document_url:', one.feedback_document_url || '(missing/empty)');
      console.log('Run scripts/sync-certificate-feedback-paths.js', projectIdRaw, 'to set these from disk, then run this script again.');
      await client.close();
      process.exit(0);
    }
    cursor = projectsColl.find({ _id: id });
  } else {
    cursor = projectsColl.find({
      $or: [
        { certificate_document_url: { $exists: true, $ne: null } },
        { feedback_document_url: { $exists: true, $ne: null } },
      ],
    });
  }

  let updatedProjects = 0;
  while (await cursor.hasNext()) {
    const project = await cursor.next();
    const projectId = project._id;
    const companyId = project.company_id;

    const certUrl = project.certificate_document_url;
    const feedbackUrl = project.feedback_document_url;

    const ops = [];

    if (certUrl) {
      const hasCertActivity = await activitiesColl.findOne({
        company_id: companyId,
        project_id: projectId,
        milestone_flow: 18,
      });
      if (!hasCertActivity) {
        ops.push({
          company_id: companyId,
          project_id: projectId,
          description: 'CII Uploaded Certificate',
          activity_type: 'cii',
          milestone_flow: 18,
          milestone_completed: true,
          createdAt: project.certificate_upload_date || new Date(),
          updatedAt: project.certificate_upload_date || new Date(),
        });
      }
    }

    if (feedbackUrl) {
      const hasFeedbackActivity = await activitiesColl.findOne({
        company_id: companyId,
        project_id: projectId,
        milestone_flow: 23,
      });
      if (!hasFeedbackActivity) {
        ops.push({
          company_id: companyId,
          project_id: projectId,
          description: 'CII Uploaded Feedback Report',
          activity_type: 'cii',
          milestone_flow: 23,
          milestone_completed: true,
          createdAt: project.feedback_upload_date || new Date(),
          updatedAt: project.feedback_upload_date || new Date(),
        });
      }
    }

    if (ops.length > 0) {
      await activitiesColl.insertMany(ops);
      updatedProjects += 1;
      console.log(
        'Backfilled activities for project',
        projectId.toString(),
        'company',
        companyId.toString(),
        'inserted',
        ops.length,
        'activity/activities',
      );
    } else if (projectIdRaw && (certUrl || feedbackUrl)) {
      console.log(
        'Project',
        projectId.toString(),
        ': certificate/feedback activities (18 & 23) already exist – nothing to insert. Refresh Quick View.',
      );
    }
  }

  console.log('Done. Projects updated:', updatedProjects);
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

