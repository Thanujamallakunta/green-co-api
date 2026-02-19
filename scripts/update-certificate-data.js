/**
 * Update Certificate Data Script
 * 
 * This script updates certificate_document_url and feedback_document_url
 * for a specific project in MongoDB.
 * 
 * Usage:
 * 1. Update the PROJECT_ID and file paths below
 * 2. Make sure MONGODB_URI is set in your .env file
 * 3. Run: node scripts/update-certificate-data.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';

// ============================================
// UPDATE THESE VALUES
// ============================================
const PROJECT_ID = '6994af7e1c64cedc200bd8ca'; // Your project ID from the frontend logs

// Update these paths to match your actual file locations
const CERTIFICATE_DOCUMENT_URL = 'uploads/certificates/6994af7e1c64cedc200bd8ca/certificate.pdf';
const FEEDBACK_DOCUMENT_URL = 'uploads/feedback/6994af7e1c64cedc200bd8ca/feedback.pdf';
const SCORE_BAND_STATUS = 1; // 0 = not available, 1 = available
const PERCENTAGE_SCORE = 76.5; // Optional: overall score percentage
const SCORE_BAND_PDF_PATH = 'uploads/scorebands/6994af7e1c64cedc200bd8ca/Score_Band.pdf'; // Optional
// ============================================

async function updateCertificateData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('companyprojects'); // MongoDB collection name

    // Find the project first to verify it exists
    const project = await collection.findOne({ _id: PROJECT_ID });
    
    if (!project) {
      // Try with ObjectId if string ID doesn't work
      const { ObjectId } = require('mongodb');
      const projectWithObjectId = await collection.findOne({ _id: new ObjectId(PROJECT_ID) });
      
      if (!projectWithObjectId) {
        console.error('❌ Project not found with ID:', PROJECT_ID);
        console.log('\n💡 Available projects:');
        const allProjects = await collection.find({}).limit(5).toArray();
        allProjects.forEach(p => {
          console.log(`  - ID: ${p._id}, Company ID: ${p.company_id}`);
        });
        return;
      }
    }

    // Update the project
    const updateData = {
      certificate_document_url: CERTIFICATE_DOCUMENT_URL,
      feedback_document_url: FEEDBACK_DOCUMENT_URL,
      score_band_status: SCORE_BAND_STATUS,
    };

    if (PERCENTAGE_SCORE !== null) {
      updateData.percentage_score = PERCENTAGE_SCORE;
    }

    if (SCORE_BAND_PDF_PATH) {
      updateData.score_band_pdf_path = SCORE_BAND_PDF_PATH;
    }

    // Try with string ID first
    let result = await collection.updateOne(
      { _id: PROJECT_ID },
      { $set: updateData }
    );

    // If no match, try with ObjectId
    if (result.matchedCount === 0) {
      const { ObjectId } = require('mongodb');
      result = await collection.updateOne(
        { _id: new ObjectId(PROJECT_ID) },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      console.error('❌ Project not found. Please check the PROJECT_ID.');
      return;
    }

    if (result.modifiedCount > 0) {
      console.log('✅ Certificate data updated successfully!');
      console.log('\n📋 Updated fields:');
      console.log(`   - certificate_document_url: ${CERTIFICATE_DOCUMENT_URL}`);
      console.log(`   - feedback_document_url: ${FEEDBACK_DOCUMENT_URL}`);
      console.log(`   - score_band_status: ${SCORE_BAND_STATUS}`);
      if (PERCENTAGE_SCORE) {
        console.log(`   - percentage_score: ${PERCENTAGE_SCORE}`);
      }
      if (SCORE_BAND_PDF_PATH) {
        console.log(`   - score_band_pdf_path: ${SCORE_BAND_PDF_PATH}`);
      }
    } else {
      console.log('ℹ️  No changes made (data might already be set).');
    }

    // Verify the update
    const updatedProject = await collection.findOne({ _id: PROJECT_ID });
    if (!updatedProject) {
      const { ObjectId } = require('mongodb');
      const updatedProjectWithObjectId = await collection.findOne({ _id: new ObjectId(PROJECT_ID) });
      if (updatedProjectWithObjectId) {
        console.log('\n📄 Current project data:');
        console.log(JSON.stringify(updatedProjectWithObjectId, null, 2));
      }
    } else {
      console.log('\n📄 Current project data:');
      console.log(JSON.stringify(updatedProject, null, 2));
    }

  } catch (error) {
    console.error('❌ Error updating certificate data:', error.message);
    console.error(error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

// Run the script
updateCertificateData();

