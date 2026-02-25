/**
 * List primary data rows where any numeric field (fy1–fy5) is not zero.
 *
 * Usage:
 *   node scripts/list-primary-data-nonzero.js [path-to-primary-data.json]
 *   (default: scripts/data/primary-data-699dec95067fd70f4293d548.json)
 */

const path = require('path');
const fs = require('fs');

const defaultPath = path.join(__dirname, 'data', 'primary-data-699dec95067fd70f4293d548.json');
const jsonPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultPath;

if (!fs.existsSync(jsonPath)) {
  console.error('File not found:', jsonPath);
  process.exit(1);
}

const raw = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(raw);
const rows = data.rows || [];

const fyKeys = ['fy1', 'fy2', 'fy3', 'fy4', 'fy5'];

function hasNonZeroNumeric(row) {
  return fyKeys.some((k) => typeof row[k] === 'number' && row[k] !== 0);
}

const nonZeroRows = rows.filter(hasNonZeroNumeric);

console.log('Primary data:', data.projectId || '(no projectId)');
console.log('Total rows:', rows.length);
console.log('Rows with at least one non-zero numeric (fy1–fy5):', nonZeroRows.length);
console.log('');

if (nonZeroRows.length === 0) {
  console.log('No rows with non-zero numerics.');
  process.exit(0);
}

nonZeroRows.forEach((row, i) => {
  const values = fyKeys.map((k) => `${k}=${row[k]}`).join(', ');
  console.log(`${i + 1}. ${row.parameter || row.data_id} (${row.info_type || '-'})`);
  console.log('   ', values);
});
