/**
 * Seed Certificate / View Score Band data for a project (MongoDB).
 * Populates: criteria_projectscore, high_projectscore, max_score, total_score, max_points, percentage_score, score_band_status.
 * Use so GET api/company/projects/:projectId/certificate returns full table data and CERTIFICATION level.
 *
 * Usage:
 *   node scripts/seed-certificate-scoreband-data.js <projectId> [percentage]
 *
 * Examples:
 *   node scripts/seed-certificate-scoreband-data.js 6994af7e1c64cedc200bd8ca
 *   node scripts/seed-certificate-scoreband-data.js 6994af7e1c64cedc200bd8ca 72
 *
 * percentage: optional (35–100). If omitted, uses 72 (Gold). Certification: ≥35 Certified, ≥45 Bronze, ≥55 Silver, ≥65 Gold, ≥75 Platinum, ≥85 Platinum+.
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';

const PARAMETERS = ['GSC', 'IE', 'PSL', 'MS', 'EM', 'CBM', 'WTM', 'MRM', 'GBE'];

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco');
  }
}

const BANDS_PER_ROW = 20; // Points bands: 1–10, 11–20, … 191–200

/**
 * Build score band arrays in 9×20 shape (9 rows × 20 numbers).
 * Frontend expects: value > 0 → red (company), X (benchmark), blue (max).
 */
function buildScoreBandData(targetPercentage) {
  const pct = Math.min(100, Math.max(0, targetPercentage));
  const n = PARAMETERS.length;
  const maxPerParam = 20;
  const max_points = n * maxPerParam;
  const total_score = Math.round((pct / 100) * max_points);
  const base = Math.floor(total_score / n);
  const remainder = total_score - base * n;
  const companyScores = PARAMETERS.map((_, i) => base + (i < remainder ? 1 : 0));
  const benchmarkScores = companyScores.map((s) => Math.min(maxPerParam, s + 1 + (s < maxPerParam ? 1 : 0)));

  // Row helper: first `count` bands get 1, rest 0 (so grid shows filled cells).
  function row(count) {
    const r = Array(BANDS_PER_ROW).fill(0);
    for (let i = 0; i < Math.min(count, BANDS_PER_ROW); i++) r[i] = 1;
    return r;
  }

  const criteria_projectscore = companyScores.map((s) => row(s));
  const high_projectscore = benchmarkScores.map((s) => row(s));
  const max_score = PARAMETERS.map(() => row(maxPerParam));

  const percentage_score = max_points > 0 ? (total_score * 100) / max_points : 0;

  return {
    criteria_projectscore,
    high_projectscore,
    max_score,
    total_score,
    max_points,
    percentage_score: Math.round(percentage_score * 10) / 10,
  };
}

async function run() {
  const projectId = process.argv[2];
  const percentageArg = process.argv[3];
  const targetPercentage = percentageArg ? parseFloat(percentageArg) : 72;

  if (!projectId) {
    console.error('Usage: node scripts/seed-certificate-scoreband-data.js <projectId> [percentage]');
    console.error('Example: node scripts/seed-certificate-scoreband-data.js 6994af7e1c64cedc200bd8ca 72');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const coll = db.collection('companyprojects');

  let id = projectId;
  try {
    id = new ObjectId(projectId);
  } catch (_) {}

  const project = await coll.findOne({ _id: id });
  if (!project) {
    console.error('Project not found:', projectId);
    await client.close();
    process.exit(1);
  }

  const data = buildScoreBandData(targetPercentage);

  await coll.updateOne(
    { _id: id },
    {
      $set: {
        score_band_status: 1,
        criteria_projectscore: data.criteria_projectscore,
        high_projectscore: data.high_projectscore,
        max_score: data.max_score,
        total_score: data.total_score,
        max_points: data.max_points,
        percentage_score: data.percentage_score,
      },
    },
  );

  console.log('Certificate / Score Band data updated for project:', projectId);
  console.log('  total_score:', data.total_score);
  console.log('  max_points:', data.max_points);
  console.log('  percentage_score:', data.percentage_score + '%');
  console.log('  score_band_status: 1');
  console.log('  criteria_projectscore: 9 rows × 20 bands (shape required by frontend)');
  console.log('\nGET api/company/projects/' + projectId + '/certificate will return this data. certification_level is derived from percentage_score.');

  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
