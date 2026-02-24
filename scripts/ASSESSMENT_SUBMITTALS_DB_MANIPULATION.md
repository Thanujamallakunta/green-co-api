# How to manipulate Assessment Submittals (and related) in the DB

Use these scripts to add, list, update, and fix assessment submittal data directly in MongoDB. Ensure `MONGODB_URI` is set in `.env` and the `mongodb` package is installed.

**Scripts summary**

| Script | What it does |
|--------|----------------|
| `list-assessment-submittals.js [projectId]` | List assessment submittals (get _id for updates) |
| `list-resource-documents.js <projectId>` | List all resource docs and their document_type |
| `add-assessment-submittal.js` | Add one submittal (projectId, file, title, description, status) |
| `add-assessment-submittals-from-json.js <json>` | Add many submittals from JSON |
| `seed-assessment-submittals-by-category.js <projectId>` | Add one submittal per category (GSC, IE, PSL, …) |
| `update-assessment-submittal.js <id> --status N --remarks "..."` | Update one submittal status/remarks |
| `update-assessment-submittals-from-json.js <json>` | Bulk-update status/remarks from JSON |
| `set-resource-document-type.js <id> assessment_submittal` | Fix document_type so doc appears in API |
| `set-company-sector.js [companyId] [sectorId]` | List sectors (no args) or set company sector (Group/Sector) |
| `deactivate-assessment-submittal.js <id>` | Soft-delete (hide from API) |

---

## 1. Collections involved

| Collection | Purpose |
|------------|---------|
| **companyresourcedocuments** | Assessment submittals (and other resource docs). Use `document_type: 'assessment_submittal'`. |
| **companyprojects** | Projects (project_id, company_id). |
| **companies** | Company profile. **Group/Sector** come from `companies.mst_sector_id` → **sectors** collection. |
| **sectors** | Master list of sectors; each has `name`, `group_name`. |

---

## 2. Add assessment submittals

### One at a time
```bash
node scripts/add-assessment-submittal.js <projectId> <filename-or-path> [document_title] [description] [document_status]
```
- **document_status:** 0=Pending, 1=Accepted, 2=Not Accepted, 3=Under Review (default 0).
- Example:  
  `node scripts/add-assessment-submittal.js 6994af7e1c64cedc200bd8ca sample.pdf "GSC Evidence" "GSC" 0`

### One per category (GSC, IE, PSL, MS, EM, CBM, WTM, MRM, GBE)
```bash
node scripts/seed-assessment-submittals-by-category.js <projectId>
```
- Uses `uploads/resources/<projectId>/sample.pdf`. Puts one doc per category with `description` = category code.

### Many from a JSON file
```bash
node scripts/add-assessment-submittals-from-json.js scripts/data/assessment-submittals.sample.json
```
- JSON: array of `{ "projectId", "documentPathOrFilename", "document_title?", "description?", "document_status?" }`.  
- Copy `scripts/data/assessment-submittals.sample.json`, edit projectId and entries.

---

## 3. List / inspect data

### List assessment submittals (by project or all)
```bash
node scripts/list-assessment-submittals.js [projectId]
```
- Example: `node scripts/list-assessment-submittals.js 6994af7e1c64cedc200bd8ca`  
- Use the printed `_id` values when updating or fixing.

### List all resource documents for a project (see document_type)
```bash
node scripts/list-resource-documents.js <projectId>
```
- Shows every resource doc and whether it’s `assessment_submittal` or something else (e.g. `general`).

---

## 4. Update approval status and remarks

### One submittal (CLI)
```bash
node scripts/update-assessment-submittal.js <submittalId> [--status 0|1|2|3] [--remarks "text"] [--title "Title"] [--description "Desc"]
```
- Example:  
  `node scripts/update-assessment-submittal.js 699b05ffe4f1acea5825f72b --status 1 --remarks "Approved"`

### Many from a JSON file
```bash
node scripts/update-assessment-submittals-from-json.js scripts/data/assessment-submittals-updates.sample.json
```
- JSON: array of `{ "id": "<document _id>", "document_status?", "document_remarks?" }`.  
- Copy `scripts/data/assessment-submittals-updates.sample.json`, paste real `_id`s from `list-assessment-submittals.js`, set status (0–3) and remarks.

---

## 5. Fix document_type (so docs show as assessment submittals)

If docs exist but have `document_type: 'general'` (or missing):

```bash
node scripts/set-resource-document-type.js <documentId> assessment_submittal
```
- Get `<documentId>` from `node scripts/list-resource-documents.js <projectId>`.

---

## 6. Hide a submittal (soft delete)

```bash
node scripts/deactivate-assessment-submittal.js <submittalId>
```
- Sets `is_active: false` so it no longer appears in the API.

---

## 7. Group and sector (where they come from)

**Group** and **sector** in the API are **not** stored on assessment submittals. They come from:

1. **companies** → `mst_sector_id` (ObjectId)
2. **sectors** → that sector’s `group_name` (GROUP) and `name` (SECTOR)

So to “add” or change group/sector for a company in the DB:

1. Find the sector you want:
   - Either call **GET** `api/company/groups-sectors` and note the sector `id` you want,  
   - Or in MongoDB: `db.sectors.find({}, { name: 1, group_name: 1 })` and note `_id`.

2. Set the company’s sector:
   - In MongoDB:  
     `db.companies.updateOne({ _id: ObjectId("<companyId>") }, { $set: { mst_sector_id: ObjectId("<sectorId>") } })`  
   - Or use a one-off script that does the same.

**Option A – script:** Run `node scripts/set-company-sector.js` with no args to list sectors; then `node scripts/set-company-sector.js <companyId> <sectorId>` to set.  
**Option B – MongoDB:** `db.companies.updateOne({ _id: ObjectId("<companyId>") }, { $set: { mst_sector_id: ObjectId("<sectorId>") } })`

---

## 8. Quick reference: document_status

| value | Meaning        |
|-------|----------------|
| 0     | Pending        |
| 1     | Accepted       |
| 2     | Not Accepted   |
| 3     | Under Review   |

---

## 9. End-to-end example: add data for one project

```bash
# 1. Seed one submittal per category (GSC, IE, PSL, …)
node scripts/seed-assessment-submittals-by-category.js 6994af7e1c64cedc200bd8ca

# 2. List to get _ids
node scripts/list-assessment-submittals.js 6994af7e1c64cedc200bd8ca

# 3. Update status/remarks for a few (replace IDs with real ones)
node scripts/update-assessment-submittal.js <id1> --status 1 --remarks "Approved"
node scripts/update-assessment-submittal.js <id2> --status 3 --remarks "Under review"

# Or bulk from JSON: edit scripts/data/assessment-submittals-updates.sample.json with real ids, then:
node scripts/update-assessment-submittals-from-json.js scripts/data/assessment-submittals-updates.sample.json
```

After that, **GET** `api/company/projects/6994af7e1c64cedc200bd8ca/resources-center` will return group, sector, approval status options, and all submittals with approval status and remarks.
