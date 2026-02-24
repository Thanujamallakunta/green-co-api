/**
 * Script to add a coordinator to the master data
 * 
 * Usage:
 * node scripts/add-coordinator.js <name> <email> [status]
 * 
 * Examples:
 * node scripts/add-coordinator.js "John Coordinator" "john.coordinator@example.com"
 * node scripts/add-coordinator.js "Sarah Manager" "sarah.manager@example.com" "1"
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const name = process.argv[2];
const email = process.argv[3];
const status = process.argv[4] || '1';

if (!name || !email) {
  console.error('❌ Usage: node scripts/add-coordinator.js <name> <email> [status]');
  console.error('   Example: node scripts/add-coordinator.js "John Coordinator" "john.coordinator@example.com"');
  process.exit(1);
}

async function addCoordinator() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1);
    const db = client.db(dbName);

    // Check if coordinator with this email already exists
    const existing = await db.collection('coordinators').findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      console.error('❌ Coordinator with this email already exists:');
      console.error('   Name:', existing.name);
      console.error('   Email:', existing.email);
      console.error('   ID:', existing._id.toString());
      process.exit(1);
    }

    // Insert coordinator
    const result = await db.collection('coordinators').insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      status: status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Coordinator added successfully!');
    console.log('📝 Details:');
    console.log('   ID:', result.insertedId.toString());
    console.log('   Name:', name);
    console.log('   Email:', email.toLowerCase().trim());
    console.log('   Status:', status === '1' ? 'Active' : 'Inactive');
    console.log('\n💡 Use this ID when assigning coordinator to projects:');
    console.log('   coordinator_id:', result.insertedId.toString());

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

addCoordinator();



