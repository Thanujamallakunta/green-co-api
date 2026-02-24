# Run Primary Data Scripts (Node terminal)

From the **project root** (`c:\green-co-apis`), run these in a Node terminal.  
Make sure **MongoDB** is running and `.env` has `MONGODB_URI` set.

---

## 1. Seed Primary Data sections (create all 12 sections in DB)

Creates one row per section in `master_primary_data_checklist` if missing. Safe to run multiple times.

```bash
node scripts/seed-primary-data-master.js
```

---

## 2. List Primary Data master data (see what’s in DB)

Shows all sections and row counts.

```bash
node scripts/seed-primary-data-master.js list
```

---

## 3. Get project ID and company ID (for other scripts / API)

Replace `PROJECT_ID` with your project’s `_id` (e.g. from the app URL or list-projects).

```bash
node scripts/get-project-and-company-id.js PROJECT_ID
```

Example:

```bash
node scripts/get-project-and-company-id.js 6994af7e1c64cedc200bd8ca
```

---

## 4. List projects

```bash
node scripts/list-projects.js
```

---

## 5. Launch and Training (Site Visit Report)

**Show current values:**

```bash
node scripts/set-launch-and-training.js PROJECT_ID
```

**Set document and date** (use your company_id in path or just filename):

```bash
node scripts/set-launch-and-training.js PROJECT_ID "uploads/companyproject/launchAndTraining/COMPANY_ID/Report.pdf" 2025-02-21
```

**Or set by filename only** (script uses company_id from project):

```bash
node scripts/set-launch-and-training.js PROJECT_ID Site_Visit_Report.pdf 2025-02-21
```

**Create folder structure for uploads:**

```bash
node scripts/create-launch-and-training-dirs.js PROJECT_ID
```

---

## 6. Finance invoices (optional)

**Seed invoices for a project:**

```bash
node scripts/seed-finance-invoices.js PROJECT_ID
```

**List invoices:**

```bash
node scripts/manage-invoice-mongodb.js list PROJECT_ID
```

**Set approval for all invoices of a project (e.g. 1 = Approved):**

```bash
node scripts/manage-invoice-mongodb.js set-approval-project PROJECT_ID 1
```

---

## One-time setup: seed Primary Data and check

Run these in order:

```bash
cd c:\green-co-apis
node scripts/seed-primary-data-master.js
node scripts/seed-primary-data-master.js list
```

After that, the Primary Data API (e.g. GET `primary-data`, GET `primary-data/sections`) will return all 12 sections from the DB.
