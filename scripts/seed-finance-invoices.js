/**
 * Seed sample Finance (Proforma + Tax) invoice data for a project.
 * Uses company_id from the project; creates one Proforma and one Tax invoice.
 *
 * Usage:
 *   node scripts/seed-finance-invoices.js <projectId>
 *
 * Example:
 *   node scripts/seed-finance-invoices.js 6994af7e1c64cedc200bd8ca
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const COLL = 'companies_payments_invoices_info';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

const projectId = process.argv[2];

if (!projectId) {
  console.error('❌ Usage: node scripts/seed-finance-invoices.js <projectId>');
  console.error('   Example: node scripts/seed-finance-invoices.js 6994af7e1c64cedc200bd8ca');
  process.exit(1);
}

const SAMPLE_DATA = [
  {
    payment_for: 'per_inv',
    payable_amount: 10000,
    tax_amount: 1800,
    total_amount: 11800,
    invoice_document_filename: 'Proforma_Invoice.pdf',
    approval_status: 0,
  },
  {
    payment_for: 'inv',
    payable_amount: 15000,
    tax_amount: 2700,
    total_amount: 17700,
    invoice_document_filename: 'Tax_Invoice.pdf',
    approval_status: 0,
  },
];

async function seed() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    let dbName = 'greenco_db';
    try {
      const pathname = new URL(MONGODB_URI).pathname;
      if (pathname && pathname.length > 1) dbName = pathname.replace(/^\//, '');
    } catch (_) {}
    const db = client.db(dbName);

    const project = await db.collection('companyprojects').findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      console.error('❌ Project not found:', projectId);
      process.exit(1);
    }

    const companyId = project.company_id;
    const now = new Date();

    for (const row of SAMPLE_DATA) {
      const existing = await db.collection(COLL).findOne({
        company_id: companyId,
        project_id: new ObjectId(projectId),
        payment_for: row.payment_for,
      });

      if (existing) {
        console.log('⏭️  Invoice already exists:', row.payment_for, '— skipping');
        continue;
      }

      const doc = {
        company_id: companyId,
        project_id: new ObjectId(projectId),
        payment_for: row.payment_for,
        payable_amount: row.payable_amount,
        tax_amount: row.tax_amount,
        total_amount: row.total_amount,
        invoice_document_filename: row.invoice_document_filename,
        payment_status: 0,
        approval_status: row.approval_status ?? 0,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection(COLL).insertOne(doc);
      const label = row.payment_for === 'per_inv' ? 'Proforma (PI)' : 'Tax Invoice';
      console.log('✅ Created', label, '| _id:', result.insertedId.toString(), '| ₹', row.total_amount);
    }

    console.log('');
    console.log('📋 List invoices: node scripts/manage-invoice-mongodb.js list', projectId);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

seed();
