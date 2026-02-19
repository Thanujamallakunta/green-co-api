/**
 * List Projects Script
 * 
 * This script lists all projects in the database so you can find your project ID.
 * 
 * Usage:
 * 1. Make sure MONGODB_URI is set in your .env file
 * 2. Run: node scripts/list-projects.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';

async function listProjects() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const collection = db.collection('companyprojects');

    const projects = await collection.find({}).toArray();

    if (projects.length === 0) {
      console.log('❌ No projects found in database.');
      return;
    }

    console.log(`📋 Found ${projects.length} project(s):\n`);
    console.log('='.repeat(80));

    projects.forEach((project, index) => {
      console.log(`\n${index + 1}. Project ID: ${project._id}`);
      console.log(`   Company ID: ${project.company_id}`);
      console.log(`   Process Type: ${project.process_type || 'N/A'}`);
      console.log(`   Certificate Document: ${project.certificate_document_url || 'null'}`);
      console.log(`   Feedback Document: ${project.feedback_document_url || 'null'}`);
      console.log(`   Score Band Status: ${project.score_band_status || 0}`);
      console.log(`   Percentage Score: ${project.percentage_score || 'N/A'}`);
      console.log(`   Created: ${project.createdAt || 'N/A'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Copy the Project ID you want to update and use it in update-certificate-data.js');

  } catch (error) {
    console.error('❌ Error listing projects:', error.message);
    console.error(error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

// Run the script
listProjects();

