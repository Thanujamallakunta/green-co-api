/**
 * Add invoice records TO the database from a JSON file.
 * Reads an array of invoice objects and inserts each into companies_payments_invoices_info.
 *
 * Usage:
 *   node scripts/add-invoices-from-json.js <path-to.json>
 *
 * JSON file format (array of objects). Required: project_id, payment_for.
 * company_id is optional — will be taken from companyprojects if omitted.
 *
 * Example invoices-to-add.json:
 * [
 *   { "project_id": "6994af7e1c64cedc200bd8ca", "payment_for": "per_inv", "payable_amount": 10000, "tax_amount": 1800, "total_amount": 11800 },
 *   { "project_id": "6994af7e1c64cedc200bd8ca", "payment_for": "inv", "payable_amount": 15000, "tax_amount": 2700, "total_amount": 17700 }
 * ]
 *
 * Run:
 *   node scripts/add-invoices-from-json.js invoices-to-add.json
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const COLL = 'companies_payments_invoices_info';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('❌ Usage: node scripts/add-invoices-from-json.js <path-to.json>');
  console.error('   Example: node scripts/add-invoices-from-json.js invoices-to-add.json');
  process.exit(1);
}

const fullPath = path.isAbsolute(jsonPath) ? jsonPath : path.join(process.cwd(), jsonPath);
if (!fs.existsSync(fullPath)) {
  console.error('❌ File not found:', fullPath);
  process.exit(1);
}

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : 'greenco_db';
    return client.db(dbName || 'greenco_db');
  } catch {
    return client.db('greenco_db');
  }
}

async function addToDb() {
  let client;
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : [data];

    if (list.length === 0) {
      console.error('❌ JSON file has no items (empty array)');
      process.exit(1);
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = getDb(client);

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      const projectId = row.project_id || row.projectId;
      const companyId = row.company_id || row.companyId;
      const paymentFor = row.payment_for || row.paymentFor;

      if (!projectId || !paymentFor) {
        console.error('❌ Row', i + 1, ': missing project_id or payment_for. Skipped.');
        skipped++;
        continue;
      }
      if (!['per_inv', 'inv'].includes(paymentFor)) {
        console.error('❌ Row', i + 1, ': payment_for must be per_inv or inv. Skipped.');
        skipped++;
        continue;
      }

      let companyIdObj = companyId ? new ObjectId(companyId) : null;
      if (!companyIdObj) {
        const project = await db.collection('companyprojects').findOne({ _id: new ObjectId(projectId) });
        if (!project) {
          console.error('❌ Row', i + 1, ': project not found:', projectId, '— skipped.');
          skipped++;
          continue;
        }
        companyIdObj = project.company_id;
      }

      const existing = await db.collection(COLL).findOne({
        company_id: companyIdObj,
        project_id: new ObjectId(projectId),
        payment_for: paymentFor,
      });

      const now = new Date();
      const doc = {
        company_id: companyIdObj,
        project_id: new ObjectId(projectId),
        payment_for: paymentFor,
        payable_amount: row.payable_amount != null ? Number(row.payable_amount) : 0,
        tax_amount: row.tax_amount != null ? Number(row.tax_amount) : 0,
        total_amount: row.total_amount != null ? Number(row.total_amount) : 0,
        invoice_document: row.invoice_document || null,
        invoice_document_filename: row.invoice_document_filename || null,
        payment_type: row.payment_type || null,
        payment_status: row.payment_status != null ? Number(row.payment_status) : 0,
        trans_id: row.trans_id || null,
        offline_tran_doc: row.offline_tran_doc || null,
        offline_tran_doc_filename: row.offline_tran_doc_filename || null,
        approval_status: row.approval_status != null ? Number(row.approval_status) : 0,
        createdAt: now,
        updatedAt: now,
      };

      if (existing) {
        await db.collection(COLL).updateOne(
          { _id: existing._id },
          {
            $set: {
              payable_amount: doc.payable_amount,
              tax_amount: doc.tax_amount,
              total_amount: doc.total_amount,
              invoice_document: doc.invoice_document,
              invoice_document_filename: doc.invoice_document_filename,
              approval_status: doc.approval_status,
              updatedAt: now,
            },
          },
        );
        console.log('✅ Updated invoice', existing._id.toString(), '|', paymentFor, '| ₹', doc.total_amount);
      } else {
        const result = await db.collection(COLL).insertOne(doc);
        console.log('✅ Added invoice', result.insertedId.toString(), '|', paymentFor, '| ₹', doc.total_amount);
        added++;
      }
    }

    console.log('');
    console.log('Done. Added:', added, '| Updated:', list.length - added - skipped, '| Skipped:', skipped);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error('❌ Invalid JSON in file:', err.message);
    } else {
      console.error('❌ Error:', err.message);
    }
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

addToDb();
