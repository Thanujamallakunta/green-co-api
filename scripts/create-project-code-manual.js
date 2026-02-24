/**
 * Script to manually create project code (Milestone 6)
 * This script updates project_id, next_activities_id, and creates activity log
 * 
 * Usage:
 * node scripts/create-project-code-manual.js <projectId> <projectCode>
 * 
 * Examples:
 * node scripts/create-project-code-manual.js 6994af7e1c64cedc200bd8ca PROJ-2024-001
 * node scripts/create-project-code-manual.js 6994af7e1c64cedc200bd8ca GC2024001
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const projectId = process.argv[2];
const projectCode = process.argv[3];

if (!projectId || !projectCode) {
  console.error('❌ Usage: node scripts/create-project-code-manual.js <projectId> <projectCode>');
  console.error('   Example: node scripts/create-project-code-manual.js 6994af7e1c64cedc200bd8ca PROJ-2024-001');
  process.exit(1);
}

// Validate project code format
const projectCodePattern = /^[A-Z0-9_-]+$/;
if (!projectCodePattern.test(projectCode)) {
  console.error('❌ Invalid project code format. Only uppercase letters, numbers, hyphens, and underscores allowed.');
  process.exit(1);
}

if (projectCode.length < 3 || projectCode.length > 50) {
  console.error('❌ Project code must be between 3 and 50 characters');
  process.exit(1);
}

async function createProjectCode() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1);
    const db = client.db(dbName);

    console.log('🔍 Finding project...');
    const project = await db.collection('companyprojects').findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      console.error('❌ Project not found');
      process.exit(1);
    }

    console.log('📄 Current project:', {
      _id: project._id.toString(),
      current_project_id: project.project_id || 'Not set',
      current_next_activities_id: project.next_activities_id,
      company_id: project.company_id?.toString(),
    });

    // Check if project code already exists
    console.log('🔍 Checking if project code is unique...');
    const existingProject = await db.collection('companyprojects').findOne({
      project_id: projectCode,
      _id: { $ne: new ObjectId(projectId) },
    });

    if (existingProject) {
      console.error('❌ Project code already exists:', projectCode);
      console.error('   Used by project:', existingProject._id.toString());
      process.exit(1);
    }

    console.log('✅ Project code is unique');

    // Update project
    console.log('📝 Updating project...');
    const updateResult = await db.collection('companyprojects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          project_id: projectCode,
          next_activities_id: 7, // Assign Project Co-Ordinator
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      console.error('❌ Failed to update project');
      process.exit(1);
    }

    console.log('✅ Project updated:', {
      project_id: projectCode,
      next_activities_id: 7,
    });

    // Create activity log (Milestone 6)
    console.log('📝 Creating activity log...');
    await db.collection('companyactivities').insertOne({
      company_id: project.company_id,
      project_id: new ObjectId(projectId),
      description: 'CII to provide Project Code',
      activity_type: 'cii',
      milestone_flow: 6,
      milestone_completed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Activity logged (Milestone 6)');

    // Verify the update
    const verifyProject = await db.collection('companyprojects').findOne({
      _id: new ObjectId(projectId),
    });

    console.log('🔍 Verification:', {
      projectId: verifyProject._id.toString(),
      project_id: verifyProject.project_id,
      next_activities_id: verifyProject.next_activities_id,
    });

    // Check if activity was created
    const verifyActivity = await db.collection('companyactivities').findOne({
      project_id: new ObjectId(projectId),
      milestone_flow: 6,
    }, { sort: { createdAt: -1 } });

    if (verifyActivity) {
      console.log('✅ Activity verified:', {
        description: verifyActivity.description,
        milestone_flow: verifyActivity.milestone_flow,
        milestone_completed: verifyActivity.milestone_completed,
      });
    }

    console.log('\n🎉 Project code created successfully!');
    console.log('📝 Summary:');
    console.log('   - Project Code:', projectCode);
    console.log('   - Next Activity: Assign Project Co‑Ordinator (Milestone 7)');
    console.log('   - Milestone 6: Completed');
    console.log('\n🔄 Refresh your Quickview to see the updated next step.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ObjectId')) {
      console.error('   Make sure the project ID is a valid MongoDB ObjectId');
    }
    if (client) {
      await client.close();
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

createProjectCode();



