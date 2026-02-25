/**
 * Call the Primary Data API (GET) for a project.
 * Use after add-primary-data-from-json.js to verify saved values are returned.
 *
 * Usage:
 *   # Option A: Login with company email/password, then fetch primary data
 *   node scripts/get-primary-data-api.js <projectId> --email <company-email> --password <password>
 *
 *   # Option B: Use existing JWT token
 *   set TOKEN=your-jwt-token
 *   node scripts/get-primary-data-api.js <projectId>
 *
 *   # Option C: Use different API base (default: http://localhost:3001)
 *   set API_URL=http://localhost:3001
 *   node scripts/get-primary-data-api.js <projectId> --email <email> --password <password>
 *
 * Example:
 *   node scripts/get-primary-data-api.js 699dec95067fd70f4293d548 --email company@example.com --password mypass
 */

require('dotenv').config();

const projectId = process.argv[2];
const args = process.argv.slice(3);
const emailIdx = args.indexOf('--email');
const passwordIdx = args.indexOf('--password');
const email = emailIdx >= 0 ? args[emailIdx + 1] : process.env.COMPANY_EMAIL;
const password = passwordIdx >= 0 ? args[passwordIdx + 1] : process.env.COMPANY_PASSWORD;
const token = process.env.TOKEN;
const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

if (!projectId) {
  console.error('Usage: node scripts/get-primary-data-api.js <projectId> [--email <email> --password <password>]');
  console.error('   Or set TOKEN=your-jwt or COMPANY_EMAIL/COMPANY_PASSWORD in .env');
  process.exit(1);
}

async function parseJson(res, label) {
  const text = await res.text();
  if ((text || '').trim().startsWith('<')) {
    console.error(`${label}: Server returned HTML instead of JSON.`);
    console.error('  URL:', res.url);
    console.error('  Is the NestJS API running? Default port is 3001. Try:');
    console.error('    $env:API_URL="http://localhost:3001"; node scripts/get-primary-data-api.js ...');
    process.exit(1);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`${label}: Invalid JSON:`, text.slice(0, 200));
    process.exit(1);
  }
}

async function login() {
  const res = await fetch(`${API_URL}/api/company/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson(res, 'Login');
  if (!res.ok || data.status !== 'success' || !data.data?.token) {
    console.error('Login failed:', data.message || data);
    process.exit(1);
  }
  return data.data.token;
}

async function getPrimaryData(accessToken) {
  const res = await fetch(`${API_URL}/api/company/projects/${projectId}/primary-data`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await parseJson(res, 'GET primary-data');
  if (!res.ok) {
    console.error('GET primary-data failed:', res.status, data.message || data);
    process.exit(1);
  }
  return data;
}

async function run() {
  let accessToken = token;
  if (!accessToken) {
    if (!email || !password) {
      console.error('Provide --email and --password, or set TOKEN=... or COMPANY_EMAIL/COMPANY_PASSWORD in .env');
      process.exit(1);
    }
    console.log('Logging in as', email, '...');
    accessToken = await login();
    console.log('Login OK.');
  }

  console.log('Fetching primary data for project', projectId, '...');
  const result = await getPrimaryData(accessToken);
  const d = result.data || {};
  const savedCount = d.saved_by_data_id ? Object.keys(d.saved_by_data_id).length : 0;
  console.log('');
  console.log('Primary data response:');
  console.log('  project_id:', d.project_id);
  console.log('  master_primary_data rows:', (d.master_primary_data || []).length);
  console.log('  saved rows (saved_by_data_id):', savedCount);
  console.log('  final_submit_docs:', d.final_submit_docs);
  console.log('  primary_data_approval_count:', d.primary_data_approval_count);
  if (savedCount > 0) {
    console.log('');
    console.log('Sample saved row (first data_id):');
    const firstId = Object.keys(d.saved_by_data_id)[0];
    const row = d.saved_by_data_id[firstId];
    console.log(JSON.stringify({ data_id: firstId, fy1: row.fy1, fy2: row.fy2, fy3: row.fy3, fy4: row.fy4, fy5: row.fy5 }, null, 2));
  }
  console.log('');
  console.log('Full response saved to get-primary-data-output.json');
  require('fs').writeFileSync(
    require('path').join(__dirname, 'get-primary-data-output.json'),
    JSON.stringify(result, null, 2),
    'utf8',
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
