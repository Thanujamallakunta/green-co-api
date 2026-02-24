# MongoDB Direct Upload Guide - Proposal Documents

Since you don't have admin access, here are **3 ways** to upload proposal documents directly via MongoDB:

---

## Method 1: Using Node.js Script (Recommended) ✅

### Step 1: Install MongoDB Driver
```bash
npm install mongodb
```

**Note:** If you're using MongoDB Atlas, make sure your connection string includes your database name:
```
mongodb+srv://username:password@cluster.mongodb.net/greenco_db
```

### Step 2: Set Environment Variables
Create or update `.env`:
```env
MONGODB_URI=mongodb+srv://your-connection-string/greenco_db
API_BASE_URL=http://localhost:3001
```

### Step 3: Run the Script
```bash
node scripts/upload-proposal-document.js <projectId> <filePath>
```

**Example:**
```bash
node scripts/upload-proposal-document.js 6994af7e1c64cedc200bd8ca ./proposal.pdf
```

**What the script does:**
1. ✅ Copies file to `uploads/proposals/{projectId}/`
2. ✅ Updates `companyprojects.proposal_document` field
3. ✅ Logs Milestone 3: "CII Uploaded Proposal Document"
4. ✅ Updates `next_activities_id` to 4
5. ✅ Generates company `reg_id` if not exists
6. ✅ Creates notification

---

## Method 2: MongoDB Atlas Direct Update

### Step 1: Upload File to Server

First, upload your PDF file to your server at:
```
uploads/proposals/{projectId}/proposal.pdf
```

Or use any file hosting service and get a URL.

### Step 2: Update MongoDB via Atlas UI

1. **Go to MongoDB Atlas** → Your Database → `companyprojects` collection
2. **Find your project** (use `_id` or `project_id`)
3. **Click "Edit Document"**
4. **Update these fields:**

```json
{
  "proposal_document": "http://localhost:3001/uploads/proposals/6994af7e1c64cedc200bd8ca/proposal.pdf",
  "next_activities_id": 4,
  "updatedAt": ISODate("2026-02-20T13:30:00.000Z")
}
```

5. **Save the document**

### Step 3: Create Activity Log Entry

1. **Go to `companyactivities` collection**
2. **Click "Insert Document"**
3. **Paste this JSON:**

```json
{
  "company_id": ObjectId("6994af7e1c64cedc200bd8ca"),
  "project_id": ObjectId("6994af7e1c64cedc200bd8ca"),
  "description": "CII Uploaded Proposal Document",
  "activity_type": "cii",
  "milestone_flow": 3,
  "milestone_completed": true,
  "createdAt": ISODate("2026-02-20T13:30:00.000Z"),
  "updatedAt": ISODate("2026-02-20T13:30:00.000Z")
}
```

**Important:** Replace `6994af7e1c64cedc200bd8ca` with your actual `company_id` and `project_id`.

### Step 4: Generate Company Registration ID (if needed)

1. **Go to `companies` collection**
2. **Find your company**
3. **If `reg_id` is missing, add:**

```json
{
  "reg_id": "REG20260220133000"
}
```

---

## Method 3: MongoDB Shell Commands

### Step 1: Connect to MongoDB
```bash
mongosh "mongodb+srv://your-connection-string/greenco_db"
```

### Step 2: Update Company Project

```javascript
// Replace with your actual project ID
const projectId = ObjectId("6994af7e1c64cedc200bd8ca");

// Update proposal document
db.companyprojects.updateOne(
  { _id: projectId },
  {
    $set: {
      proposal_document: "http://localhost:3001/uploads/proposals/6994af7e1c64cedc200bd8ca/proposal.pdf",
      next_activities_id: 4,
      updatedAt: new Date()
    }
  }
);
```

### Step 3: Create Activity Log

```javascript
// Get company_id from project
const project = db.companyprojects.findOne({ _id: projectId });

// Create activity log
db.companyactivities.insertOne({
  company_id: project.company_id,
  project_id: projectId,
  description: "CII Uploaded Proposal Document",
  activity_type: "cii",
  milestone_flow: 3,
  milestone_completed: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Step 4: Generate Registration ID (if needed)

```javascript
// Get company
const company = db.companies.findOne({ _id: project.company_id });

// Generate reg_id if missing
if (!company.reg_id) {
  db.companies.updateOne(
    { _id: company._id },
    {
      $set: {
        reg_id: "REG" + Date.now(),
        updatedAt: new Date()
      }
    }
  );
}
```

---

## 📋 Quick Reference: What Fields to Update

### 1. Company Projects Collection (`companyprojects`)

**Fields to update:**
```json
{
  "proposal_document": "http://localhost:3001/uploads/proposals/{projectId}/proposal.pdf",
  "next_activities_id": 4,
  "updatedAt": ISODate("2026-02-20T13:30:00.000Z")
}
```

### 2. Company Activities Collection (`companyactivities`)

**New document to insert:**
```json
{
  "company_id": ObjectId("..."),
  "project_id": ObjectId("..."),
  "description": "CII Uploaded Proposal Document",
  "activity_type": "cii",
  "milestone_flow": 3,
  "milestone_completed": true,
  "createdAt": ISODate("2026-02-20T13:30:00.000Z"),
  "updatedAt": ISODate("2026-02-20T13:30:00.000Z")
}
```

### 3. Companies Collection (`companies`)

**If `reg_id` is missing:**
```json
{
  "reg_id": "REG20260220133000",
  "updatedAt": ISODate("2026-02-20T13:30:00.000Z")
}
```

---

## 🔍 How to Find Your Project ID

### Option 1: From Frontend
- Check browser console after login
- Look for `localStorage.getItem('greenco_project_id')`

### Option 2: From MongoDB
```javascript
// Find by company email
db.companies.findOne({ email: "your-email@example.com" });

// Then find project
db.companyprojects.findOne({ company_id: ObjectId("...") });
```

### Option 3: From Quickview API Response
```bash
GET /api/company/projects/{projectId}/quickview
```
The response includes `profile.id` which is the project ID.

---

## ✅ Verification Steps

After uploading, verify:

1. **Check Proposal Document Field:**
```javascript
db.companyprojects.findOne({ _id: ObjectId("...") }, { proposal_document: 1 });
```

2. **Check Activity Log:**
```javascript
db.companyactivities.find({ project_id: ObjectId("..."), milestone_flow: 3 }).sort({ createdAt: -1 });
```

3. **Check Next Activities ID:**
```javascript
db.companyprojects.findOne({ _id: ObjectId("...") }, { next_activities_id: 1 });
```

4. **Test API Endpoint:**
```bash
GET /api/company/projects/{projectId}/proposal-document
```

Should return:
```json
{
  "status": "success",
  "data": {
    "has_document": true,
    "document_url": "http://localhost:3001/uploads/proposals/..."
  }
}
```

---

## 🚀 Recommended Approach

**Use Method 1 (Node.js Script)** because it:
- ✅ Handles file copying automatically
- ✅ Updates all required fields
- ✅ Logs milestone correctly
- ✅ Generates reg_id if needed
- ✅ Creates notifications
- ✅ Less error-prone than manual updates

---

## 📝 Example: Complete Upload Process

```bash
# 1. Place your proposal PDF in the project root
cp /path/to/proposal.pdf ./proposal.pdf

# 2. Run the script
node scripts/upload-proposal-document.js 6994af7e1c64cedc200bd8ca ./proposal.pdf

# 3. Verify
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/company/projects/6994af7e1c64cedc200bd8ca/proposal-document
```

---

**Choose the method that works best for you!** The Node.js script is the easiest and most reliable. ✅

