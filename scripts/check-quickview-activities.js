/**
 * Check what activities exist for a project (for Quick View debugging).
 * Usage: node scripts/check-quickview-activities.js <projectIdOrCompanyId>
 *
 * Shows: project doc, count of activities, and each activity's milestone_flow, milestone_completed, description.
 * If you pass company id, finds first project for that company and checks its activities.
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
  const idRaw = process.argv[2];
  if (!idRaw) {
    console.log('Usage: node scripts/check-quickview-activities.js <projectIdOrCompanyId>');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const activitiesColl = db.collection('companyactivities');

  let idObj = null;
  try {
    idObj = new ObjectId(idRaw);
  } catch (_) {}

  // Find project: by _id or by company_id (first project for company)
  let project = idObj ? await projectsColl.findOne({ _id: idObj }) : null;
  if (!project) {
    project = await projectsColl.findOne({ company_id: idObj || idRaw });
  }
  if (!project) {
    console.log('No project found for id:', idRaw);
    await client.close();
    process.exit(1);
  }

  const projectId = project._id;
  const companyId = project.company_id;
  console.log('Project _id:', projectId.toString());
  console.log('Project company_id:', companyId && (companyId.toString || companyId));
  console.log('certificate_document_url:', project.certificate_document_url ? 'set' : 'not set');
  console.log('feedback_document_url:', project.feedback_document_url ? 'set' : 'not set');
  console.log('');

  // Activities with ObjectId (what backfill uses)
  const activitiesObj = await activitiesColl
    .find({ company_id: companyId, project_id: projectId })
    .sort({ createdAt: -1 })
    .toArray();
  // Activities with string id (in case stored as string)
  const activitiesStr = await activitiesColl
    .find({ company_id: idRaw, project_id: idRaw })
    .sort({ createdAt: -1 })
    .toArray();

  const byObj = activitiesObj.length;
  const byStr = activitiesStr.length;
  console.log('Activities found by ObjectId (company_id, project_id):', byObj);
  console.log('Activities found by string id:', byStr);
  console.log('');

  const list = byObj > 0 ? activitiesObj : activitiesStr;
  if (list.length === 0) {
    console.log('No activities for this project – Quick View "Latest Step" will fall back to 0 or first step.');
    await client.close();
    return;
  }

  console.log('Activities (milestone_flow, milestone_completed, description):');
  list.forEach((a, i) => {
    console.log(
      `  ${i + 1}. milestone_flow=${a.milestone_flow} completed=${a.milestone_completed} "${(a.description || '').slice(0, 50)}"`
    );
  });

  const completed = list.filter((a) => a.milestone_completed && a.milestone_flow);
  const maxFlow = completed.length ? Math.max(...completed.map((a) => a.milestone_flow)) : 0;
  console.log('');
  console.log('Max completed milestone_flow:', maxFlow);
  console.log('Has step 18 (certificate):', list.some((a) => a.milestone_flow === 18));
  console.log('Has step 23 (feedback):', list.some((a) => a.milestone_flow === 23));

  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
