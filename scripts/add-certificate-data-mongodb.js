/**
 * Add certificate / View Certificate data via MongoDB (Overall Score, Green Card Assessment, certificate PDF).
 * Updates companyprojects with percentage_score, total_score, max_points, criteria_projectscore,
 * and certificate_document_url (if a PDF is copied). Optionally sets next_activities_id to 19 and creates a notification.
 *
 * Usage:
 *   node scripts/add-certificate-data-mongodb.js <projectId> [path-to.json]
 *   node scripts/add-certificate-data-mongodb.js <projectId> [path-to.json] --certificate=path/to/certificate.pdf
 *
 * Example:
 *   node scripts/add-certificate-data-mongodb.js 699dec95067fd70f4293d548
 *   node scripts/add-certificate-data-mongodb.js 699dec95067fd70f4293d548 scripts/data/certificate-data-sample.json --certificate=uploads/company_certificate/6994af7e1c64cedc200bd8ca/certificate.pdf
 *
 * If --certificate is omitted but JSON has "certificate_path", that path is used. If neither is set, script looks for
 * uploads/company_certificate/<any-project>/certificate.pdf and copies it so the certificate document is uploaded.
 *
 * JSON: percentage_score, total_score, max_points, score_band_status, certificate_path, values_70_80,
 * advance_step, send_notification. Green Card legend: Red = points scored by company, Blue = max points
 * company can score, X = max points by another GreenCo company.
 *   company_score_band_indices: 9 arrays of band indices (0–19) for RED (e.g. [13,14,15,16] = 131–170).
 *   max_bands_per_row: 9 numbers for BLUE per row (e.g. [14,14,...,13] = blue up to 131–140 for rows 0–7, 121–130 for row 8).
 *   high_bands_filled: one number for X (e.g. 17 = another company up to 161–170).
 * See scripts/data/certificate-scoreband-red-blue-ui.json for UI-matching sample.
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

const BANDS = 20;
const ROWS = 9;

// Default from image: Overall Score 78.50% (750/1000), Green Card 70-80% column: 1, 3, 0, 3, 5, 5, 3, 0, 0 (x = 0)
const DEFAULT_PERCENTAGE_SCORE = 78.5;
const DEFAULT_TOTAL_SCORE = 750;
const DEFAULT_MAX_POINTS = 1000;
const DEFAULT_70_80_COLUMN_INDEX = 14;
const DEFAULT_CRITERIA_70_80 = [1, 3, 0, 3, 5, 5, 3, 0, 0];

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco_db';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco_db');
  }
}

/** Build 9×20 criteria_projectscore; valuesAt70_80 = array of 9 numbers for the 70-80% column */
function buildCriteriaProjectscore(valuesAt70_80 = DEFAULT_CRITERIA_70_80) {
  return Array.from({ length: ROWS }, (_, rowIndex) => {
    const arr = Array(BANDS).fill(0);
    const val = valuesAt70_80[rowIndex] ?? 0;
    if (val > 0) arr[DEFAULT_70_80_COLUMN_INDEX] = val;
    return arr;
  });
}

/** Build 9×20 grid with 1s in first n bands (0 to n-1), 0 elsewhere. For GreenCo Scoreband: company scored up to band n. */
function buildScoreBandGrid(bandsFilled) {
  const n = Math.min(Math.max(0, parseInt(bandsFilled, 10) || 0), BANDS);
  return Array.from({ length: ROWS }, () => {
    const arr = Array(BANDS).fill(0);
    for (let i = 0; i < n; i++) arr[i] = 1;
    return arr;
  });
}

/**
 * Build criteria_projectscore (red = "Points scored by company") from per-row band indices.
 * Band 0 = 1-10, 1 = 11-20, ... 13 = 131-140, 14 = 141-150, ... 19 = 191-200.
 * redBandIndicesPerRow: array of 9 arrays; each inner array lists band indices (0-19) that get 1 for that row.
 * Example: [[13,14],[13,14],...,[15,16,17]] → red only in 131-140 & 141-150 for rows 0-7, and 151-160/161-170/171-180 for row 8.
 */
function buildCriteriaFromRedBands(redBandIndicesPerRow) {
  if (!Array.isArray(redBandIndicesPerRow) || redBandIndicesPerRow.length === 0) return null;
  const rows = redBandIndicesPerRow.slice(0, ROWS).map((indices) => {
    const arr = Array(BANDS).fill(0);
    (Array.isArray(indices) ? indices : []).forEach((idx) => {
      const i = parseInt(idx, 10);
      if (i >= 0 && i < BANDS) arr[i] = 1;
    });
    return arr;
  });
  while (rows.length < ROWS) rows.push(Array(BANDS).fill(0));
  return rows;
}

/**
 * Build max_score (blue = "Maximum Points can score by company") from per-row band counts.
 * max_bands_per_row: array of 9 numbers; each is how many bands (from 0) get 1 for that row.
 * E.g. [14,14,14,14,14,14,14,14,13] → blue 1-10 to 131-140 for rows 0-7, 1-10 to 121-130 for row 8.
 */
function buildMaxScoreFromPerRow(maxBandsPerRow) {
  if (!Array.isArray(maxBandsPerRow) || maxBandsPerRow.length === 0) return null;
  const rows = maxBandsPerRow.slice(0, ROWS).map((n) => {
    const arr = Array(BANDS).fill(0);
    const count = Math.min(Math.max(0, parseInt(n, 10) || 0), BANDS);
    for (let i = 0; i < count; i++) arr[i] = 1;
    return arr;
  });
  while (rows.length < ROWS) rows.push(Array(BANDS).fill(0));
  return rows;
}

async function run() {
  const projectId = process.argv[2];
  const jsonPath = process.argv[3];

  if (!projectId) {
    console.error('Usage: node scripts/add-certificate-data-mongodb.js <projectId> [path-to.json]');
    process.exit(1);
  }
  if (!/^[a-f0-9]{24}$/i.test(projectId)) {
    console.error('Error: projectId must be a 24-character hex string (e.g. 699dec95067fd70f4293d548). Got:', projectId.length, 'chars.');
    process.exit(1);
  }

  let percentage_score = DEFAULT_PERCENTAGE_SCORE;
  let total_score = DEFAULT_TOTAL_SCORE;
  let max_points = DEFAULT_MAX_POINTS;
  let score_band_status = 1;
  let criteria_projectscore = buildCriteriaProjectscore();
  let high_projectscore = null;
  let max_score = null;
  let advance_step = true;
  let send_notification = true;
  let certificate_path = process.argv.find((a) => a.startsWith('--certificate='))
    ? process.argv.find((a) => a.startsWith('--certificate=')).replace(/^--certificate=/, '')
    : null;

  if (jsonPath) {
    const resolved = path.resolve(process.cwd(), jsonPath);
    if (!fs.existsSync(resolved)) {
      console.error('File not found:', resolved);
      process.exit(1);
    }
    try {
      const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      if (data.percentage_score != null) percentage_score = Number(data.percentage_score);
      if (data.total_score != null) total_score = Number(data.total_score);
      if (data.max_points != null) max_points = Number(data.max_points);
      if (data.score_band_status != null) score_band_status = data.score_band_status ? 1 : 0;
      if (Array.isArray(data.criteria_projectscore) && data.criteria_projectscore.length > 0) {
        criteria_projectscore = data.criteria_projectscore.slice(0, ROWS).map((row) => {
          const r = Array.isArray(row) ? row : (row && row.scores) ? row.scores : [];
          const nums = r.slice(0, BANDS).map((x) => (typeof x === 'number' ? x : 0));
          while (nums.length < BANDS) nums.push(0);
          return nums;
        });
      } else if (Array.isArray(data.values_70_80) && data.values_70_80.length >= ROWS) {
        criteria_projectscore = buildCriteriaProjectscore(data.values_70_80);
      }
      if (data.criteria_bands_filled != null && !data.company_score_band_indices) {
        criteria_projectscore = buildScoreBandGrid(data.criteria_bands_filled);
      }
      if (data.company_score_band_indices != null) {
        const built = buildCriteriaFromRedBands(data.company_score_band_indices);
        if (built) criteria_projectscore = built;
      }
      if (data.high_bands_filled != null) {
        high_projectscore = buildScoreBandGrid(data.high_bands_filled);
      }
      if (data.max_bands_per_row != null) {
        const built = buildMaxScoreFromPerRow(data.max_bands_per_row);
        if (built) max_score = built;
      } else if (data.max_bands_filled != null) {
        max_score = buildScoreBandGrid(data.max_bands_filled);
      }
      if (Array.isArray(data.high_projectscore) && data.high_projectscore.length > 0) {
        high_projectscore = data.high_projectscore.slice(0, ROWS).map((row) => {
          const r = Array.isArray(row) ? row : (row && row.scores) ? row.scores : [];
          const nums = r.slice(0, BANDS).map((x) => (typeof x === 'number' ? x : 0));
          while (nums.length < BANDS) nums.push(0);
          return nums;
        });
      }
      if (Array.isArray(data.max_score) && data.max_score.length > 0) {
        max_score = data.max_score.slice(0, ROWS).map((row) => {
          const r = Array.isArray(row) ? row : (row && row.scores) ? row.scores : [];
          const nums = r.slice(0, BANDS).map((x) => (typeof x === 'number' ? x : 0));
          while (nums.length < BANDS) nums.push(0);
          return nums;
        });
      }
      if (typeof data.advance_step === 'boolean') advance_step = data.advance_step;
      if (typeof data.send_notification === 'boolean') send_notification = data.send_notification;
      if (data.certificate_path) certificate_path = data.certificate_path;
    } catch (e) {
      console.error('Invalid JSON:', e.message);
      process.exit(1);
    }
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const notificationsColl = db.collection('notifications');

  const project = await projectsColl.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    process.exit(1);
  }

  const companyId = project.company_id;
  const pId = new ObjectId(projectId);
  const now = new Date();

  const update = {
    percentage_score,
    total_score,
    max_points,
    score_band_status,
    criteria_projectscore,
    updatedAt: now,
  };
  if (high_projectscore) update.high_projectscore = high_projectscore;
  if (max_score) update.max_score = max_score;

  if (advance_step) {
    const currentNext = project.next_activities_id ?? 0;
    if (currentNext < 19) update.next_activities_id = 19;
  }

  // Certificate PDF: copy to uploads/company_certificate/{projectId}/ and set document fields
  const uploadsDir = path.join(process.cwd(), 'uploads', 'company_certificate', projectId);
  let sourcePdf = certificate_path ? path.resolve(process.cwd(), certificate_path) : null;
  if (!sourcePdf) {
    const otherCert = path.join(process.cwd(), 'uploads', 'company_certificate', '6994af7e1c64cedc200bd8ca', 'certificate.pdf');
    if (fs.existsSync(otherCert)) sourcePdf = otherCert;
  }
  if (sourcePdf && fs.existsSync(sourcePdf)) {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = 'certificate.pdf';
    const destPath = path.join(uploadsDir, filename);
    fs.copyFileSync(sourcePdf, destPath);
    const relativePath = `uploads/company_certificate/${projectId}/${filename}`;
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 3);
    update.certificate_document_url = relativePath;
    update.certificate_document_filename = filename;
    update.certificate_upload_date = now;
    update.certificate_expiry_date = expiry;
    console.log('Certificate PDF copied to', relativePath);
  } else if (certificate_path) {
    console.warn('Certificate file not found:', certificate_path, '- skipping certificate document.');
  } else {
    console.warn('No certificate PDF provided and no default found at uploads/company_certificate/6994af7e1c64cedc200bd8ca/certificate.pdf - run with --certificate=path/to/certificate.pdf to set certificate document.');
  }

  await projectsColl.updateOne({ _id: pId }, { $set: update });

  if (send_notification) {
    await notificationsColl.insertOne({
      title: 'Certificate / Score Card Data Added',
      content: `Your certificate and Green Card Assessment data have been updated. Overall Score: ${percentage_score}% (${total_score} / ${max_points} pts.). You can view the score card in View Certificate.`,
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
  console.log('Done. Certificate data updated:');
  console.log('  percentage_score:', percentage_score + '%');
  console.log('  total_score:', total_score, '/', max_points);
  console.log('  score_band_status:', score_band_status);
  console.log('  criteria_projectscore (red): 9 x 20 grid');
  if (high_projectscore) console.log('  high_projectscore (X): 9 x 20 grid');
  if (max_score) console.log('  max_score (blue): 9 x 20 grid');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
