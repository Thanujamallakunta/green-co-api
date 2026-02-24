# Dynamic data scripts – JSON input

Use these JSON files with the scripts to add data in bulk (data-driven, no code changes).

## Assessment Submittals

**Script:** `add-assessment-submittals-from-json.js`

**Run:**
```bash
node scripts/add-assessment-submittals-from-json.js scripts/data/assessment-submittals.sample.json
```

**JSON format:** Array (or `{ "submittals": [ ... ] }`). Each item:

| Field | Required | Description |
|-------|----------|-------------|
| `projectId` | Yes | Project ObjectId string |
| `documentPathOrFilename` | Yes | Filename (e.g. `GSC_Evidence.pdf`) or full path like `uploads/resources/<projectId>/file.pdf` |
| `document_title` | No | Defaults to filename |
| `description` | No | e.g. category code (GSC, IE, PSL) |
| `document_status` | No | 0=Pending, 1=Accepted, 2=Not Accepted, 3=Under Review (default 0) |

Copy `assessment-submittals.sample.json` to your own file and edit `projectId` and entries.

---

## Primary Data form

**Script:** `add-primary-data-from-json.js`

**Run:**
```bash
node scripts/add-primary-data-from-json.js scripts/data/primary-data.sample.json
```

**JSON format:** Object with `projectId`, optional `companyId`, optional `final_submit`, and `rows` array. Each row:

| Field | Required | Description |
|-------|----------|-------------|
| `data_id` | No* | Master row ObjectId (from `master_primary_data_checklist`). If omitted, script looks up by `info_type` + `parameter` |
| `info_type` | Yes (if no data_id) | Section code: gi, ee, wc, ww, re, gge, wm, mcr, gsc, ps, gin, tar |
| `parameter` | Yes (if no data_id) | Must match `master_primary_data_checklist.parameter` |
| `reference_unit`, `details`, `fy1`–`fy5`, `extrapolated`, `lt_target`, `additional_details` | No | Form values |

\* Use `data_id` when you have it (e.g. from listing master rows); otherwise use `info_type` and `parameter` so the script resolves `data_id` from the master checklist.

To list master rows (and get `_id` for `data_id`):
```bash
node scripts/seed-primary-data-master.js list
```

Copy `primary-data.sample.json` to your own file. Set `projectId` to your project; fill `rows` with one entry per master parameter you want to set.
