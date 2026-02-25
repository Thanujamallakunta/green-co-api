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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';

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
  console.error('  set-payment <projectId> <per_inv|inv> <Online|Offline> <transId|- > <supportingPath|- > <supportingFilename|- >');
  console.error('  set-approval <invoiceId> <0|1|2|3>');
  console.error('  set-approval-project <projectId> <0|1|2|3>   (all invoices for project)');
  console.error('');
  console.error('  approval_status: 0=Pending, 1=Approved, 2=Rejected, 3=Under Review');
}

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
  if (
    !cmd ||
    ![
      'list',
      'create',
      'set-amounts',
      'set-document',
      'set-payment',
      'set-approval',
      'set-approval-project',
    ].includes(cmd)
  ) {
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

      // If this is a Proforma invoice approved, log milestone 10 and advance next_activities_id to 11
      const inv = await db.collection(COLL).findOne({ _id: new ObjectId(invoiceId) });
      if (inv && statusNum === 1 && inv.payment_for === 'per_inv') {
        const now = new Date();
        await db.collection('companyactivities').insertOne({
          company_id: inv.company_id,
          project_id: inv.project_id,
          description: 'CII Acknowledged Proforma Invoice',
          activity_type: 'cii',
          milestone_flow: 10,
          milestone_completed: true,
          createdAt: now,
          updatedAt: now,
        });

        const project = await db.collection('companyprojects').findOne({ _id: inv.project_id });
        const currentNext =
          typeof project?.next_activities_id === 'number'
            ? project.next_activities_id
            : 0;
        if (currentNext < 11) {
          await db.collection('companyprojects').updateOne(
            { _id: inv.project_id },
            { $set: { next_activities_id: 11, updatedAt: now } },
          );
          console.log('next_activities_id advanced to 11 (Company Uploaded All Primary Data).');
        }
      }
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
      if (!projectId || !paymentFor || !relativePath || !['per_inv', 'inv'].includes(paymentFor)) {
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
        console.error('❌ No invoice found for this project and payment_for. Run \"create\" first.');
        process.exit(1);
      }

      const now = new Date();

      await db.collection(COLL).updateOne(
        { _id: existing._id },
        {
          $set: {
            invoice_document: relativePath,
            invoice_document_filename: filename || existing.invoice_document_filename,
            updatedAt: now,
          },
        },
      );
      console.log('✅ Invoice document set:', existing._id.toString(), '|', relativePath);

      // Log activity similar to uploadInvoiceDocument in service
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
      console.log('🛈 Activity logged:', activityDescription);

      // Notifications similar to uploadInvoiceDocument (company + facilitator)
      const companiesColl = db.collection('companies');
      const company = await companiesColl.findOne({ _id: companyId });
      const invoiceLabel =
        paymentFor === 'per_inv' ? 'Proforma Invoice document' : 'Invoice document';
      const title = `GreenCo Team has raised the ${
        paymentFor === 'per_inv' ? 'Proforma Invoice' : 'Invoice'
      } document`;
      const content = `Company ${company?.name || 'N/A'} ${invoiceLabel} has been raised by GreenCo Team`;

      // Company notification (C)
      await db.collection('notifications').insertOne({
        title,
        content,
        notify_type: 'C',
        user_id: companyId,
        seen: false,
        createdAt: now,
        updatedAt: now,
      });
      console.log('🛈 Notification created for company');

      // Facilitator notification (F) if facilitator exists
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
        console.log('🛈 Notification created for facilitator');
      }

      return;
    }

    if (cmd === 'set-payment') {
      const paymentType = paymentFor; // we re-use paymentFor variable positionally here – adjust below
      const argsOffset = 2;
      const pf = args[2];
      const payType = args[3];
      const transId = args[4] && args[4] !== '-' ? args[4] : null;
      const supportPath = args[5] && args[5] !== '-' ? args[5] : null;
      const supportFilename = args[6] && args[6] !== '-' ? args[6] : (supportPath ? supportPath.split('/').pop() : null);

      if (!projectId || !pf || !['per_inv', 'inv'].includes(pf) || !payType) {
        console.error('❌ Usage: set-payment <projectId> <per_inv|inv> <Online|Offline> <transId|- > <supportingPath|- > <supportingFilename|- >');
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
        payment_for: pf,
      });

      if (!existing) {
        console.error('❌ No invoice found for this project and payment_for. Run \"create\" first.');
        process.exit(1);
      }

      const now = new Date();
      const update = {
        payment_type: payType,
        payment_status: 1, // paid
        approval_status: existing.approval_status ?? 0, // keep current, can adjust via set-approval
        updatedAt: now,
      };
      if (transId) update.trans_id = transId;
      if (supportPath) {
        update.offline_tran_doc = supportPath;
        if (supportFilename) {
          update.offline_tran_doc_filename = supportFilename;
        }
      }

      await db.collection(COLL).updateOne(
        { _id: existing._id },
        { $set: update },
      );
      console.log('✅ Payment info set on invoice:', existing._id.toString(), '| type:', payType, '| transId:', transId || '-', '| support:', supportPath || '-');

      // Activity: Payment submitted for invoice (Proforma/Tax)
      const isPerInv = pf === 'per_inv';
      const activityDescription = `Payment submitted for invoice (${isPerInv ? 'Proforma' : 'Tax Invoice'}): ${payType}${transId ? ` - ${transId}` : ''}`;
      await db.collection('companyactivities').insertOne({
        company_id: companyId,
        project_id: new ObjectId(projectId),
        description: activityDescription,
        activity_type: 'company',
        milestone_flow: isPerInv ? 9 : undefined,
        milestone_completed: isPerInv ? true : undefined,
        createdAt: now,
        updatedAt: now,
      });
      console.log('🛈 Activity logged:', activityDescription);

      // For Proforma invoice payment, advance next_activities_id to 10 (CII Acknowledged Proforma Invoice)
      if (isPerInv) {
        const projectAfter = await db
          .collection('companyprojects')
          .findOne({ _id: new ObjectId(projectId) });
        const currentNext =
          typeof projectAfter?.next_activities_id === 'number'
            ? projectAfter.next_activities_id
            : 0;
        if (currentNext < 10) {
          await db.collection('companyprojects').updateOne(
            { _id: new ObjectId(projectId) },
            { $set: { next_activities_id: 10, updatedAt: now } },
          );
          console.log('next_activities_id advanced to 10 (CII Acknowledged Proforma Invoice).');
        }
      }

      // Notification: content only (simple text)
      const company = await db.collection('companies').findOne({ _id: companyId });
      const content = activityDescription;
      await db.collection('notifications').insertOne({
        title: 'Payment submitted',
        content,
        notify_type: 'C',
        user_id: companyId,
        seen: false,
        createdAt: now,
        updatedAt: now,
      });
      console.log('🛈 Notification created for company with content:', content);

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
