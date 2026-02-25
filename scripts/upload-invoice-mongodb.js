/**
 * Upload invoice document via script: copy a local PDF to uploads and create/update
 * the invoice record (Proforma or Tax) with activity + notifications.
 * Uses same collection and paths as the API: companies_payments_invoices_info,
 * uploads/company/{companyId}/invoices/{filename}.
 *
 * Usage:
 *   node scripts/upload-invoice-mongodb.js <projectId> <per_inv|inv> <pathToPdf> [payable] [tax] [total]
 *
 * per_inv = Proforma Invoice (PI), inv = Tax Invoice
 * If payable/tax/total omitted, defaults: 0, 0, 0 (you can update later with manage-invoice-mongodb.js set-amounts)
 *
 * Examples:
 *   node scripts/upload-invoice-mongodb.js 699ea4b08976cf56e00396f9 per_inv ./proforma.pdf
 *   node scripts/upload-invoice-mongodb.js 699ea4b08976cf56e00396f9 per_inv ./proforma.pdf 50000 9000 59000
 *   node scripts/upload-invoice-mongodb.js 699ea4b08976cf56e00396f9 inv ./tax-invoice.pdf
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

const COLL = 'companies_payments_invoices_info';
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
  const projectId = process.argv[2];
  const paymentFor = process.argv[3];
  const pathToPdf = process.argv[4];
  const payable = process.argv[5] != null ? parseFloat(process.argv[5]) : 0;
  const tax = process.argv[6] != null ? parseFloat(process.argv[6]) : 0;
  const total = process.argv[7] != null ? parseFloat(process.argv[7]) : payable + tax;

  if (!projectId || !paymentFor || !pathToPdf) {
    console.error('Usage: node scripts/upload-invoice-mongodb.js <projectId> <per_inv|inv> <pathToPdf> [payable] [tax] [total]');
    console.error('  per_inv = Proforma Invoice, inv = Tax Invoice');
    process.exit(1);
  }
  if (!['per_inv', 'inv'].includes(paymentFor)) {
    console.error('payment_for must be per_inv (Proforma) or inv (Tax Invoice)');
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(pathToPdf) ? pathToPdf : path.join(process.cwd(), pathToPdf);
  if (!fs.existsSync(absolutePath)) {
    console.error('File not found:', absolutePath);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);

  const project = await db.collection('companyprojects').findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    console.error('Project not found:', projectId);
    await client.close();
    process.exit(1);
  }

  const companyId = project.company_id;
  const companyIdStr = companyId.toString();

  const uploadDir = path.join(process.cwd(), 'uploads', 'company', companyIdStr, 'invoices');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created directory:', uploadDir);
  }

  const ext = path.extname(absolutePath) || '.pdf';
  const filename = `invoice-${paymentFor}-${Date.now()}${ext}`;
  const destPath = path.join(uploadDir, filename);
  fs.copyFileSync(absolutePath, destPath);
  const relativePath = `uploads/company/${companyIdStr}/invoices/${filename}`;
  console.log('Copied file to:', relativePath);

  const now = new Date();

  let invoice = await db.collection(COLL).findOne({
    company_id: companyId,
    project_id: new ObjectId(projectId),
    payment_for: paymentFor,
  });

  if (!invoice) {
    const insert = await db.collection(COLL).insertOne({
      company_id: companyId,
      project_id: new ObjectId(projectId),
      payment_for: paymentFor,
      invoice_document: relativePath,
      invoice_document_filename: path.basename(absolutePath),
      payable_amount: payable,
      tax_amount: tax,
      total_amount: total,
      payment_status: 0,
      approval_status: 0,
      createdAt: now,
      updatedAt: now,
    });
    invoice = { _id: insert.insertedId, company_id: companyId, project_id: new ObjectId(projectId), payment_for: paymentFor };
    console.log('Invoice created:', insert.insertedId.toString());
  } else {
    await db.collection(COLL).updateOne(
      { _id: invoice._id },
      {
        $set: {
          invoice_document: relativePath,
          invoice_document_filename: path.basename(absolutePath),
          payable_amount: payable,
          tax_amount: tax,
          total_amount: total,
          updatedAt: now,
        },
      }
    );
    console.log('Invoice document updated:', invoice._id.toString());
  }

  const activityDescription =
    paymentFor === 'per_inv' ? 'Proforma Invoice (PI) uploaded' : 'Tax Invoice uploaded';
  await db.collection('companyactivities').insertOne({
    company_id: companyId,
    project_id: new ObjectId(projectId),
    description: activityDescription,
    activity_type: 'cii',
    createdAt: now,
    updatedAt: now,
  });
  console.log('Activity logged:', activityDescription);

  // Mark milestone 8 as completed and advance next_activities_id to at least 9
  await db.collection('companyactivities').insertOne({
    company_id: companyId,
    project_id: new ObjectId(projectId),
    description: activityDescription,
    activity_type: 'cii',
    milestone_flow: 8,
    milestone_completed: true,
    createdAt: now,
    updatedAt: now,
  });

  const projectAfter = await db
    .collection('companyprojects')
    .findOne({ _id: new ObjectId(projectId) });
  const currentNext =
    typeof projectAfter?.next_activities_id === 'number'
      ? projectAfter.next_activities_id
      : 0;
  if (currentNext < 9) {
    await db.collection('companyprojects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { next_activities_id: 9, updatedAt: now } },
    );
    console.log('next_activities_id advanced to 9 (Company Paid Proforma Invoice).');
  }

  const company = await db.collection('companies').findOne({ _id: companyId });
  const invoiceLabel = paymentFor === 'per_inv' ? 'Proforma Invoice document' : 'Invoice document';
  const title = `GreenCo Team has raised the ${paymentFor === 'per_inv' ? 'Proforma Invoice' : 'Invoice'} document`;
  const content = `Company ${company?.name || 'N/A'} ${invoiceLabel} has been raised by GreenCo Team`;

  await db.collection('notifications').insertOne({
    title,
    content,
    notify_type: 'C',
    user_id: companyId,
    seen: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('Notification created for company (C)');

  const cf = await db
    .collection('companyfacilitators')
    .findOne({ company_id: companyId, project_id: new ObjectId(projectId) });
  if (cf && cf.facilitator_id) {
    await db.collection('notifications').insertOne({
      title,
      content,
      notify_type: 'F',
      user_id: cf.facilitator_id,
      seen: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Notification created for facilitator (F)');
  }

  console.log('\nDone. Invoice document:', relativePath);
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
