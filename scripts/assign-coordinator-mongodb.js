/**
 * Script to assign coordinator to project directly in MongoDB
 * 
 * Usage:
 * node scripts/assign-coordinator-mongodb.js <projectId> <coordinatorId>
 * 
 * Examples:
 * node scripts/assign-coordinator-mongodb.js 6994af7e1c64cedc200bd8ca 6994af7e1c64cedc200bd8c9
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const projectId = process.argv[2];
const coordinatorId = process.argv[3];

if (!projectId || !coordinatorId) {
  console.error('❌ Usage: node scripts/assign-coordinator-mongodb.js <projectId> <coordinatorId>');
  console.error('   Example: node scripts/assign-coordinator-mongodb.js 6994af7e1c64cedc200bd8ca 6994af7e1c64cedc200bd8c9');
  process.exit(1);
}

async function assignCoordinator() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1);
    const db = client.db(dbName);

    // Find project to get company_id
    const project = await db.collection('companyprojects').findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      console.error('❌ Project not found');
      process.exit(1);
    }

    const companyId = project.company_id;
    const now = new Date();

    // Verify coordinator exists
    const coordinator = await db.collection('coordinators').findOne({
      _id: new ObjectId(coordinatorId),
    });

    if (!coordinator) {
      console.error('❌ Coordinator not found');
      process.exit(1);
    }

    // Check if already assigned
    const existing = await db.collection('companycoordinators').findOne({
      company_id: companyId,
      project_id: new ObjectId(projectId),
      coordinator_id: new ObjectId(coordinatorId),
    });

    if (existing) {
      console.error('❌ Coordinator is already assigned to this project');
      process.exit(1);
    }

    // Assign coordinator
    await db.collection('companycoordinators').insertOne({
      company_id: companyId,
      project_id: new ObjectId(projectId),
      coordinator_id: new ObjectId(coordinatorId),
      createdAt: now,
      updatedAt: now,
    });

    // Update project next_activities_id to 8 (CII uploaded the PI/Tax Invoice)
    await db.collection('companyprojects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { next_activities_id: 8, updatedAt: now } },
    );

    // Log activity (Milestone 7: Assign Project Co‑Ordinator)
    await db.collection('companyactivities').insertOne({
      company_id: companyId,
      project_id: new ObjectId(projectId),
      description: 'Assign Project Co‑Ordinator',
      activity_type: 'cii',
      milestone_flow: 7,
      milestone_completed: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create notification for company (C)
    await db.collection('notifications').insertOne({
      title: 'GreenCo Team has assigned a Coordinator for your Project',
      content: `Coordinator ${coordinator.name} has been assigned for your project by GreenCo Team`,
      notify_type: 'C',
      user_id: companyId,
      seen: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log('✅ Coordinator assigned successfully!');
    console.log('📝 Details:');
    console.log('   Project ID:', projectId);
    console.log('   Company ID:', companyId.toString());
    console.log('   Coordinator:', coordinator.name);
    console.log('   Email:', coordinator.email);
    console.log('   Activity: Milestone 7 logged, next_activities_id set to 8, notification created.');

  } catch (error) {
    console.error('❌ Error:', error.message);
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

assignCoordinator();



