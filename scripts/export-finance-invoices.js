/**
 * Export REAL finance (invoice) data from the database.
 * Reads from: companies_payments_invoices_info
 * Optionally joins: companyprojects, companies (for project/company details)
 *
 * Usage:
 *   node scripts/export-finance-invoices.js              # print JSON to console
 *   node scripts/export-finance-invoices.js --out file.json   # write to file
 *   node scripts/export-finance-invoices.js --projectId xxx   # only for this project
 *
 * Examples:
 *   node scripts/export-finance-invoices.js
 *   node scripts/export-finance-invoices.js --out finance-invoices.json
 *   node scripts/export-finance-invoices.js --projectId 6994af7e1c64cedc200bd8ca --out project-invoices.json
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

const COLL = 'companies_payments_invoices_info';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

const args = process.argv.slice(2);
let outFile = null;
let filterProjectId = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out' && args[i + 1]) {
    outFile = args[i + 1];
    i++;
  } else if (args[i] === '--projectId' && args[i + 1]) {
    filterProjectId = args[i + 1];
    i++;
  }
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

async function exportData() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = getDb(client);

    const coll = db.collection(COLL);
    const filter = filterProjectId
      ? { project_id: new ObjectId(filterProjectId) }
      : {};
    const invoices = await coll.find(filter).sort({ createdAt: -1 }).toArray();

    if (invoices.length === 0) {
      console.error('No invoice records found in', COLL + (filterProjectId ? ' for project ' + filterProjectId : ''));
      if (outFile) fs.writeFileSync(outFile, '[]', 'utf8');
      process.exit(0);
    }

    const projects = await db.collection('companyprojects').find({}).toArray();
    const projectMap = new Map(projects.map((p) => [p._id.toString(), p]));
    const companyIds = [...new Set(projects.map((p) => p.company_id?.toString()).filter(Boolean))];
    const companies = await db.collection('companies').find({ _id: { $in: companyIds.map((id) => new ObjectId(id)) } }).toArray();
    const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));

    const APPROVAL_LABELS = ['Pending', 'Approved', 'Rejected', 'Under Review'];

    const data = invoices.map((inv) => {
      const projectIdStr = inv.project_id?.toString?.() || inv.project_id;
      const companyIdStr = inv.company_id?.toString?.() || inv.company_id;
      const project = projectMap.get(projectIdStr);
      const company = companyMap.get(companyIdStr);
      return {
        _id: inv._id.toString(),
        project_id: projectIdStr,
        company_id: companyIdStr,
        company_name: company?.name ?? null,
        project_code: project?.project_id ?? null,
        payment_for: inv.payment_for,
        payment_for_label: inv.payment_for === 'per_inv' ? 'Proforma (PI)' : 'Tax Invoice',
        invoice_document: inv.invoice_document ?? null,
        invoice_document_filename: inv.invoice_document_filename ?? null,
        payable_amount: inv.payable_amount ?? 0,
        tax_amount: inv.tax_amount ?? 0,
        total_amount: inv.total_amount ?? 0,
        payment_type: inv.payment_type ?? null,
        payment_status: inv.payment_status ?? 0,
        trans_id: inv.trans_id ?? null,
        offline_tran_doc: inv.offline_tran_doc ?? null,
        offline_tran_doc_filename: inv.offline_tran_doc_filename ?? null,
        approval_status: inv.approval_status ?? 0,
        approval_status_label: APPROVAL_LABELS[inv.approval_status ?? 0] ?? 'Pending',
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      };
    });

    const json = JSON.stringify(data, null, 2);

    if (outFile) {
      fs.writeFileSync(outFile, json, 'utf8');
      console.log('Exported', data.length, 'invoice(s) to', outFile);
    } else {
      console.log(json);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

exportData();
