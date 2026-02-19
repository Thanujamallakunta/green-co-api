# Database Update Scripts Guide

This folder contains scripts to update certificate data in MongoDB directly.

## 📋 Prerequisites

1. **Node.js** installed on your machine
2. **MongoDB connection string** in your `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   ```

## 🚀 Quick Start

### Step 1: Install MongoDB Driver (if not already installed)

```bash
npm install mongodb dotenv
```

### Step 2: List All Projects (to find your project ID)

```bash
node scripts/list-projects.js
```

This will show you all projects with their IDs. Copy the project ID you want to update.

### Step 3: Update Certificate Data

1. Open `scripts/update-certificate-data.js`
2. Update these values at the top of the file:
   ```javascript
   const PROJECT_ID = '6994af7e1c64cedc200bd8ca'; // Your project ID
   const CERTIFICATE_DOCUMENT_URL = 'uploads/certificates/6994af7e1c64cedc200bd8ca/certificate.pdf';
   const FEEDBACK_DOCUMENT_URL = 'uploads/feedback/6994af7e1c64cedc200bd8ca/feedback.pdf';
   const SCORE_BAND_STATUS = 1; // 1 = available, 0 = not available
   const PERCENTAGE_SCORE = 76.5; // Optional
   ```

3. Run the script:
   ```bash
   node scripts/update-certificate-data.js
   ```

## 📝 Alternative Methods

### Method 1: MongoDB Compass (GUI)

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using your `MONGODB_URI`
3. Navigate to `companyprojects` collection
4. Find your project document
5. Edit the fields:
   - `certificate_document_url`
   - `feedback_document_url`
   - `score_band_status`
   - `percentage_score` (optional)
   - `score_band_pdf_path` (optional)

### Method 2: MongoDB Shell (mongosh)

```bash
# Connect to MongoDB
mongosh "your-mongodb-connection-string"

# Switch to your database
use your-database-name

# Update the project
db.companyprojects.updateOne(
  { _id: ObjectId("6994af7e1c64cedc200bd8ca") },
  {
    $set: {
      certificate_document_url: "uploads/certificates/6994af7e1c64cedc200bd8ca/certificate.pdf",
      feedback_document_url: "uploads/feedback/6994af7e1c64cedc200bd8ca/feedback.pdf",
      score_band_status: 1,
      percentage_score: 76.5
    }
  }
)
```

### Method 3: MongoDB Atlas Web Interface

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to your cluster → Browse Collections
3. Find `companyprojects` collection
4. Click on your project document
5. Click "Edit Document"
6. Update the fields and save

## 🔍 Finding Your Project ID

From your frontend logs, you already have:
```
Project ID: 6994af7e1c64cedc200bd8ca
```

Or run the list script:
```bash
node scripts/list-projects.js
```

## ✅ Verification

After updating, test the API:

```bash
curl -X GET "https://green-co-api.onrender.com/api/company/projects/6994af7e1c64cedc200bd8ca/certificate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

You should see:
```json
{
  "status": "success",
  "message": "Certificate data loaded",
  "data": {
    "profile": {
      "certificate_document": "uploads/certificates/...",
      "feedback_document": "uploads/feedback/...",
      "score_band_status": 1
    }
  }
}
```

## 🆘 Troubleshooting

**Error: Cannot find module 'mongodb'**
```bash
npm install mongodb dotenv
```

**Error: Project not found**
- Check the PROJECT_ID is correct
- Run `list-projects.js` to see all available project IDs
- Make sure you're using the correct database

**Error: Connection failed**
- Check your `MONGODB_URI` in `.env` file
- Make sure your IP is whitelisted in MongoDB Atlas (if using Atlas)
- Check your network connection

