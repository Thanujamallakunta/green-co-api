// Run in mongosh: paste this entire block. Uses first project in companyprojects.

const p = db.companyprojects.findOne({}, { _id: 1, company_id: 1 });
if (!p) { print("No project found"); quit(1); }
const cid = p.company_id;
const pid = p._id;
const now = new Date();

db.companies_payments_invoices_info.insertOne({
  company_id: cid,
  project_id: pid,
  payment_for: "per_inv",
  payable_amount: 10000,
  tax_amount: 1800,
  total_amount: 11800,
  invoice_document_filename: "Proforma_Invoice.pdf",
  payment_status: 0,
  approval_status: 0,
  createdAt: now,
  updatedAt: now
});

db.companies_payments_invoices_info.insertOne({
  company_id: cid,
  project_id: pid,
  payment_for: "inv",
  payable_amount: 15000,
  tax_amount: 2700,
  total_amount: 17700,
  invoice_document_filename: "Tax_Invoice.pdf",
  payment_status: 0,
  approval_status: 0,
  createdAt: now,
  updatedAt: now
});

print("Done. 2 invoices inserted.");
