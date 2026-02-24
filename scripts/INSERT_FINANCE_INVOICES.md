# Exact insert for Finance invoices

**Collection:** `companies_payments_invoices_info`

---

## Get your project_id and company_id

From project root:

```bash
node scripts/get-project-and-company-id.js
```

Or for a specific project:

```bash
node scripts/get-project-and-company-id.js 6994af7e1c64cedc200bd8ca
```

Copy the printed `project_id` and `company_id` (24-character hex). Use them in the inserts below.

---

## Option A: mongosh (no IDs to type)

Switch to your DB, then paste and run:

```javascript
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
```

---

## Option B: Two documents for Compass (Add Document)

Replace `YOUR_COMPANY_ID` and `YOUR_PROJECT_ID` with the 24-char values from `node scripts/get-project-and-company-id.js` (or from `db.companyprojects.findOne({}, {_id:1, company_id:1})` in mongosh).

**Document 1 – Proforma**

```json
{
  "company_id": {"$oid": "YOUR_COMPANY_ID"},
  "project_id": {"$oid": "YOUR_PROJECT_ID"},
  "payment_for": "per_inv",
  "payable_amount": 10000,
  "tax_amount": 1800,
  "total_amount": 11800,
  "invoice_document_filename": "Proforma_Invoice.pdf",
  "payment_status": 0,
  "approval_status": 0,
  "createdAt": {"$date": "2025-02-21T00:00:00.000Z"},
  "updatedAt": {"$date": "2025-02-21T00:00:00.000Z"}
}
```

**Document 2 – Tax**

```json
{
  "company_id": {"$oid": "YOUR_COMPANY_ID"},
  "project_id": {"$oid": "YOUR_PROJECT_ID"},
  "payment_for": "inv",
  "payable_amount": 15000,
  "tax_amount": 2700,
  "total_amount": 17700,
  "invoice_document_filename": "Tax_Invoice.pdf",
  "payment_status": 0,
  "approval_status": 0,
  "createdAt": {"$date": "2025-02-21T00:00:00.000Z"},
  "updatedAt": {"$date": "2025-02-21T00:00:00.000Z"}
}
```
