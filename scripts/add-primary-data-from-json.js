/**
 * Add/update Primary Data form rows from a JSON file (dynamic/bulk).
 * Resolves company_id from project; each row can use data_id (from master) or info_type + parameter for lookup.
 *
 * Usage:
 *   node scripts/add-primary-data-from-json.js <path-to.json>
 *
 * JSON format:
 * {
 *   "projectId": "6994af7e1c64cedc200bd8ca",
 *   "companyId": "optional-override",
 *   "final_submit": false,
 *   "rows": [
 *     {
 *       "data_id": "ObjectId from master_primary_data_checklist",
 *       "info_type": "gi",
 *       "parameter": "Parameter name",
 *       "reference_unit": "",
 *       "details": "...",
 *       "fy1": 0, "fy2": 0, "fy3": 0, "fy4": 0, "fy5": 0,
 *       "extrapolated": null,
 *       "lt_target": null,
 *       "additional_details": null
 *     }
 *   ]
 * }
 *
 * If data_id is omitted, script looks up master_primary_data_checklist by info_type + parameter (or checklist_name) to get data_id.
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

async function run() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node scripts/add-primary-data-from-json.js <path-to.json>');
    console.error('Example: node scripts/add-primary-data-from-json.js scripts/data/primary-data.sample.json');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), jsonPath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (e) {
    console.error('Invalid JSON:', e.message);
    process.exit(1);
  }

  const projectId = data.projectId || data.project_id;
  const rows = data.rows || (Array.isArray(data) ? data : []);
  const finalSubmit = data.final_submit === true || data.final_submit === 1;

  if (!projectId || rows.length === 0) {
    console.error('JSON must have projectId and rows (array).');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const masterColl = db.collection('master_primary_data_checklist');
  const formColl = db.collection('primary_data_form');

  const project = await projectsColl.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = data.companyId ? new ObjectId(data.companyId) : project.company_id;
  const pId = new ObjectId(projectId);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let dataId = row.data_id;
    let infoType = row.info_type || 'gi';
    const parameter = row.parameter;
    const checklistName = row.checklist_name;

    if (!dataId) {
      const masterFilter = { is_active: 1 };
      if (row.info_type) masterFilter.info_type = row.info_type;
      if (parameter) masterFilter.parameter = parameter;
      else if (checklistName) masterFilter.checklist_name = checklistName;
      else {
        console.warn(`[${i + 1}] Skip: need data_id or (info_type + parameter/checklist_name)`);
        skipped++;
        continue;
      }
      const master = await masterColl.findOne(masterFilter);
      if (!master) {
        console.warn(`[${i + 1}] Skip: no master row for info_type=${infoType}, parameter=${parameter || checklistName}`);
        skipped++;
        continue;
      }
      dataId = master._id.toString();
      infoType = master.info_type || infoType;
    } else {
      try {
        new ObjectId(dataId);
      } catch (_) {
        console.warn(`[${i + 1}] Skip: invalid data_id`);
        skipped++;
        continue;
      }
    }

    const update = {
      info_type: infoType,
      parameter: row.parameter ?? null,
      reference_unit: row.reference_unit ?? null,
      details: row.details ?? null,
      fy1: row.fy1 ?? 0,
      fy2: row.fy2 ?? 0,
      fy3: row.fy3 ?? 0,
      fy4: row.fy4 ?? 0,
      fy5: row.fy5 ?? 0,
      extrapolated: row.extrapolated ?? null,
      lt_target: row.lt_target ?? null,
      additional_details: row.additional_details ?? null,
    };

    const result = await formColl.updateOne(
      { company_id: companyId, project_id: pId, data_id: new ObjectId(dataId) },
      { $set: update },
      { upsert: true },
    );

    if (result.upsertedCount || result.modifiedCount) updated++;
  }

  if (finalSubmit && updated > 0) {
    await formColl.updateMany(
      { company_id: companyId, project_id: pId },
      { $set: { final_submit: 1 } },
    );
    console.log('Set final_submit = 1 for all project rows.');
  }

  await client.close();
  console.log('');
  console.log('Done. Rows updated/inserted:', updated, 'Skipped:', skipped);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
