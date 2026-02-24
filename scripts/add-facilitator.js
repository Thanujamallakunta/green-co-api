/**
 * Script to add a facilitator to the master data
 * 
 * Usage:
 * node scripts/add-facilitator.js <name> <email> [status]
 * 
 * Examples:
 * node scripts/add-facilitator.js "Jane Facilitator" "jane.facilitator@example.com"
 * node scripts/add-facilitator.js "Robert Consultant" "robert.consultant@example.com" "1"
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const name = process.argv[2];
const email = process.argv[3];
const status = process.argv[4] || '1';

if (!name || !email) {
  console.error('❌ Usage: node scripts/add-facilitator.js <name> <email> [status]');
  console.error('   Example: node scripts/add-facilitator.js "Jane Facilitator" "jane.facilitator@example.com"');
  process.exit(1);
}

async function addFacilitator() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1);
    const db = client.db(dbName);

    // Check if facilitator with this email already exists
    const existing = await db.collection('facilitators').findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      console.error('❌ Facilitator with this email already exists:');
      console.error('   Name:', existing.name);
      console.error('   Email:', existing.email);
      console.error('   ID:', existing._id.toString());
      process.exit(1);
    }

    // Insert facilitator
    const result = await db.collection('facilitators').insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      status: status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Facilitator added successfully!');
    console.log('📝 Details:');
    console.log('   ID:', result.insertedId.toString());
    console.log('   Name:', name);
    console.log('   Email:', email.toLowerCase().trim());
    console.log('   Status:', status === '1' ? 'Active' : 'Inactive');
    console.log('\n💡 Use this ID when assigning facilitator to projects:');
    console.log('   facilitator_id:', result.insertedId.toString());

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

addFacilitator();



