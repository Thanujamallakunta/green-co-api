/**
 * Fill primary-data JSON rows so fy1–fy5 are non-zero.
 *
 * Usage:
 *   node scripts/fill-primary-data-with-nonzero.js <input.json> [output.json]
 *
 * If output.json is omitted, the input file is overwritten in-place.
 */

const fs = require('fs');
const path = require('path');

const inputArg = process.argv[2];
const outputArg = process.argv[3];

if (!inputArg) {
  console.error('Usage: node scripts/fill-primary-data-with-nonzero.js <input.json> [output.json]');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputArg);
const outputPath = outputArg ? path.resolve(process.cwd(), outputArg) : inputPath;

if (!fs.existsSync(inputPath)) {
  console.error('Input file not found:', inputPath);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
let json;
try {
  json = JSON.parse(raw);
} catch (err) {
  console.error('Failed to parse JSON:', err.message);
  process.exit(1);
}

const rows = Array.isArray(json.rows) ? json.rows : [];
const fyKeys = ['fy1', 'fy2', 'fy3', 'fy4', 'fy5'];

rows.forEach((row, rowIndex) => {
  fyKeys.forEach((key, fyIndex) => {
    const v = row[key];
    if (typeof v !== 'number' || v === 0) {
      // Simple deterministic non-zero pattern per row/year, e.g. 11,12,13...
      row[key] = (rowIndex + 1) * 10 + (fyIndex + 1);
    }
  });
});

fs.writeFileSync(outputPath, JSON.stringify(json, null, 2), 'utf8');
console.log('Wrote non-zero primary data to', outputPath);
