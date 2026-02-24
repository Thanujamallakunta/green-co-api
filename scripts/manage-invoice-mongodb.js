/**
 * Manage Finance invoices (PI/Tax) directly in MongoDB.
 * Collection: companies_payments_invoices_info
 *
 * Usage:
 *   node scripts/manage-invoice-mongodb.js list <projectId>
 *   node scripts/manage-invoice-mongodb.js create <projectId> <per_inv|inv> [payable] [tax] [total]
 *   node scripts/manage-invoice-mongodb.js set-amounts <projectId> <per_inv|inv> <payable> <tax> <total>
 *   node scripts/manage-invoice-mongodb.js set-document <projectId> <per_inv|inv> <relativePath> [filename]
 *   node scripts/manage-invoice-mongodb.js set-approval <invoiceId> <0|1|2|3>
 *   node scripts/manage-invoice-mongodb.js set-approval-project <projectId> <0|1|2|3>
 *
 * payment_for: per_inv = Proforma (PI), inv = Tax Invoice
 * approval_status: 0=Pending, 1=Approved, 2=Rejected, 3=Under Review
 *
 * Examples:
 *   node scripts/manage-invoice-mongodb.js list 6994af7e1c64cedc200bd8ca
 *   node scripts/manage-invoice-mongodb.js set-approval-project 6994af7e1c64cedc200bd8ca 1
 *   node scripts/manage-invoice-mongodb.js set-approval 69996f82fe64aec0cd517939 1
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const COLL = 'companies_payments_invoices_info';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

const args = process.argv.slice(2);
const cmd = args[0];
const projectId = args[1];
const paymentFor = args[2];
const rest = args.slice(3);

function usage() {
  console.error('Usage:');
  console.error('  list   <projectId>');
  console.error('  create <projectId> <per_inv|inv> [payable] [tax] [total]');
  console.error('  set-amounts <projectId> <per_inv|inv> <payable> <tax> <total>');
  console.error('  set-document <projectId> <per_inv|inv> <relativePath> [filename]');
  console.error('  set-approval <invoiceId> <0|1|2|3>');
  console.error('  set-approval-project <projectId> <0|1|2|3>   (all invoices for project)');
  console.error('');
  console.error('  approval_status: 0=Pending, 1=Approved, 2=Rejected, 3=Under Review');
}

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
  if (!cmd || !['list', 'create', 'set-amounts', 'set-document', 'set-approval', 'set-approval-project'].includes(cmd)) {
    usage();
    process.exit(1);
  }

  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = getDb(client);

    if (cmd === 'list') {
      if (!projectId) {
        console.error('❌ Missing projectId');
        usage();
        process.exit(1);
      }
      const project = await db.collection('companyprojects').findOne({ _id: new ObjectId(projectId) });
      if (!project) {
        console.error('❌ Project not found');
        process.exit(1);
      }
      const invoices = await db.collection(COLL).find({ project_id: new ObjectId(projectId) }).sort({ createdAt: -1 }).toArray();
      console.log('Invoices for project', projectId, '(company:', project.company_id?.toString(), '):');
      if (!invoices.length) {
        console.log('  (none)');
      } else {
        invoices.forEach((inv, i) => {
          console.log(`  ${i + 1}. _id: ${inv._id}, payment_for: ${inv.payment_for}, payable: ${inv.payable_amount ?? 0}, tax: ${inv.tax_amount ?? 0}, total: ${inv.total_amount ?? 0}, approval_status: ${inv.approval_status ?? 0}, invoice_document: ${inv.invoice_document || '-'}`);
        });
      }
      return;
    }

    if (cmd === 'set-approval') {
      const invoiceId = projectId; // second arg is invoiceId for this command
      const status = args[2];
      if (!invoiceId || status === undefined) {
        console.error('❌ Usage: set-approval <invoiceId> <0|1|2|3>');
        process.exit(1);
      }
      const statusNum = parseInt(status, 10);
      if (![0, 1, 2, 3].includes(statusNum)) {
        console.error('❌ approval_status must be 0, 1, 2, or 3');
        process.exit(1);
      }
      const result = await db.collection(COLL).updateOne(
        { _id: new ObjectId(invoiceId) },
        { $set: { approval_status: statusNum, updatedAt: new Date() } },
      );
      if (result.matchedCount === 0) {
        console.error('❌ Invoice not found');
        process.exit(1);
      }
      console.log('✅ Approval status set to', statusNum, '(0=Pending, 1=Approved, 2=Rejected, 3=Under Review)');
      return;
    }

    if (cmd === 'set-approval-project') {
      const projId = projectId;
      const status = args[2];
      if (!projId || status === undefined) {
        console.error('❌ Usage: set-approval-project <projectId> <0|1|2|3>');
        process.exit(1);
      }
      const statusNum = parseInt(status, 10);
      if (![0, 1, 2, 3].includes(statusNum)) {
        console.error('❌ approval_status must be 0, 1, 2, or 3');
        process.exit(1);
      }
      const result = await db.collection(COLL).updateMany(
        { project_id: new ObjectId(projId) },
        { $set: { approval_status: statusNum, updatedAt: new Date() } },
      );
      const label = ['Pending', 'Approved', 'Rejected', 'Under Review'][statusNum];
      console.log('✅ Updated', result.modifiedCount, 'invoice(s) to approval_status:', statusNum, '(' + label + ')');
      return;
    }

    if (cmd === 'create' || cmd === 'set-amounts') {
      if (!projectId || !paymentFor || !['per_inv', 'inv'].includes(paymentFor)) {
        console.error('❌ Usage: create|set-amounts <projectId> <per_inv|inv> [payable] [tax] [total]');
        process.exit(1);
      }
      const payable = rest[0] != null ? parseFloat(rest[0]) : 0;
      const tax = rest[1] != null ? parseFloat(rest[1]) : 0;
      const total = rest[2] != null ? parseFloat(rest[2]) : payable + tax;

      const project = await db.collection('companyprojects').findOne({ _id: new ObjectId(projectId) });
      if (!project) {
        console.error('❌ Project not found');
        process.exit(1);
      }
      const companyId = project.company_id;

      const existing = await db.collection(COLL).findOne({
        company_id: companyId,
        project_id: new ObjectId(projectId),
        payment_for: paymentFor,
      });

      const now = new Date();
      const update = {
        payable_amount: payable,
        tax_amount: tax,
        total_amount: total,
        updatedAt: now,
      };

      if (existing) {
        await db.collection(COLL).updateOne(
          { _id: existing._id },
          { $set: update },
        );
        console.log('✅ Invoice updated:', existing._id.toString(), '|', paymentFor, '| payable:', payable, 'tax:', tax, 'total:', total);
      } else {
        const doc = {
          company_id: companyId,
          project_id: new ObjectId(projectId),
          payment_for: paymentFor,
          payable_amount: payable,
          tax_amount: tax,
          total_amount: total,
          payment_status: 0,
          approval_status: 0,
          createdAt: now,
          updatedAt: now,
        };
        const insert = await db.collection(COLL).insertOne(doc);
        console.log('✅ Invoice created:', insert.insertedId.toString(), '|', paymentFor, '| payable:', payable, 'tax:', tax, 'total:', total);
      }
      return;
    }

    if (cmd === 'set-document') {
      const relativePath = rest[0];
      const filename = rest[1] || (relativePath ? relativePath.split('/').pop() : '');
      if (!projectId || !paymentFor || !relativePath) {
        console.error('❌ Usage: set-document <projectId> <per_inv|inv> <relativePath> [filename]');
        process.exit(1);
      }
      const project = await db.collection('companyprojects').findOne({ _id: new ObjectId(projectId) });
      if (!project) {
        console.error('❌ Project not found');
        process.exit(1);
      }
      const companyId = project.company_id;

      const existing = await db.collection(COLL).findOne({
        company_id: companyId,
        project_id: new ObjectId(projectId),
        payment_for: paymentFor,
      });

      if (!existing) {
        console.error('❌ No invoice found for this project and payment_for. Run "create" first.');
        process.exit(1);
      }

      await db.collection(COLL).updateOne(
        { _id: existing._id },
        { $set: { invoice_document: relativePath, invoice_document_filename: filename || existing.invoice_document_filename, updatedAt: new Date() } },
      );
      console.log('✅ Invoice document set:', existing._id.toString(), '|', relativePath);
      return;
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

run();
