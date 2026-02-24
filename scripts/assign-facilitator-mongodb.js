/**
 * Script to assign facilitator to project directly in MongoDB
 * 
 * Usage:
 * node scripts/assign-facilitator-mongodb.js <projectId> <facilitatorId> [contractFee]
 * 
 * Examples:
 * node scripts/assign-facilitator-mongodb.js 6994af7e1c64cedc200bd8ca 6994af7e1c64cedc200bd8ca
 * node scripts/assign-facilitator-mongodb.js 6994af7e1c64cedc200bd8ca 6994af7e1c64cedc200bd8ca 50000
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const projectId = process.argv[2];
const facilitatorId = process.argv[3];
const contractFee = process.argv[4] ? parseInt(process.argv[4]) : 0;

if (!projectId || !facilitatorId) {
  console.error('❌ Usage: node scripts/assign-facilitator-mongodb.js <projectId> <facilitatorId> [contractFee]');
  console.error('   Example: node scripts/assign-facilitator-mongodb.js 6994af7e1c64cedc200bd8ca 6994af7e1c64cedc200bd8ca 50000');
  process.exit(1);
}

async function assignFacilitator() {
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

    // Verify facilitator exists
    const facilitator = await db.collection('facilitators').findOne({
      _id: new ObjectId(facilitatorId),
    });

    if (!facilitator) {
      console.error('❌ Facilitator not found');
      process.exit(1);
    }

    // Check if facilitator already assigned (update instead of insert)
    const existing = await db.collection('companyfacilitators').findOne({
      company_id: companyId,
      project_id: new ObjectId(projectId),
    });

    if (existing) {
      // Update existing facilitator
      await db.collection('companyfacilitators').updateOne(
        { _id: existing._id },
        {
          $set: {
            facilitator_id: new ObjectId(facilitatorId),
            contract_fee: contractFee,
            updatedAt: new Date(),
          },
        }
      );
      console.log('✅ Facilitator assignment updated!');
    } else {
      // Insert new facilitator assignment
      await db.collection('companyfacilitators').insertOne({
        company_id: companyId,
        project_id: new ObjectId(projectId),
        facilitator_id: new ObjectId(facilitatorId),
        contract_fee: contractFee,
        contract_doc_status: 0, // Not signed yet
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Facilitator assigned successfully!');
    }

    console.log('📝 Details:');
    console.log('   Project ID:', projectId);
    console.log('   Company ID:', companyId.toString());
    console.log('   Facilitator:', facilitator.name);
    console.log('   Email:', facilitator.email);
    console.log('   Contract Fee:', contractFee);
    console.log('   Contract Status: Not signed (0)');

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

assignFacilitator();



