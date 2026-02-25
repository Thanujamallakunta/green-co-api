/**
 * Script to approve/reject a work order
 * 
 * Usage:
 * node scripts/approve-work-order.js <projectId> <workOrderId> <status> [remarks]
 * 
 * Examples:
 * node scripts/approve-work-order.js 6994af7e1c64cedc200bd8ca 6994af7e1c64cedc200bd8ca 1
 * node scripts/approve-work-order.js 6994af7e1c64cedc200bd8ca 6994af7e1c64cedc200bd8ca 2 "Missing information"
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';
const projectId = process.argv[2];
const workOrderId = process.argv[3];
const woStatus = parseInt(process.argv[4]); // 1 = Approved, 2 = Rejected
const woRemarks = process.argv[5] || null;

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco');
  }
}

if (!projectId || !workOrderId || !woStatus) {
  console.error('❌ Usage: node scripts/approve-work-order.js <projectId> <workOrderId> <status> [remarks]');
  console.error('   status: 1 = Approved, 2 = Rejected');
  process.exit(1);
}

if (woStatus !== 1 && woStatus !== 2) {
  console.error('❌ Status must be 1 (Approved) or 2 (Rejected)');
  process.exit(1);
}

async function approveWorkOrder() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = getDb(client);

    console.log('🔍 Finding work order...');
    const workOrder = await db.collection('companyworkorders').findOne({
      _id: new ObjectId(workOrderId),
      project_id: new ObjectId(projectId),
    });

    if (!workOrder) {
      console.error('❌ Work order not found');
      process.exit(1);
    }

    console.log('📄 Current work order:', {
      _id: workOrder._id.toString(),
      project_id: workOrder.project_id.toString(),
      wo_status: workOrder.wo_status,
      wo_doc: workOrder.wo_doc,
    });

    // Update work order status
    const updateResult = await db.collection('companyworkorders').updateOne(
      { _id: new ObjectId(workOrderId) },
      {
        $set: {
          wo_status: woStatus,
          wo_remarks: woStatus === 2 ? woRemarks : null,
          wo_doc_status_updated_at: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      console.error('❌ Failed to update work order');
      process.exit(1);
    }

    console.log('✅ Work order status updated:', {
      wo_status: woStatus,
      wo_status_label: woStatus === 1 ? 'Approved' : 'Rejected',
      wo_remarks: woRemarks,
    });

    // If approved, update project next_activities_id
    if (woStatus === 1) {
      const project = await db.collection('companyprojects').findOne({
        _id: new ObjectId(projectId),
      });

      if (project) {
        await db.collection('companyprojects').updateOne(
          { _id: new ObjectId(projectId) },
          {
            $set: {
              next_activities_id: 6,
              updatedAt: new Date(),
            },
          }
        );
        console.log('✅ Project next_activities_id updated to 6');
      }

      // Generate reg_id if not exists
      const company = await db.collection('companies').findOne({
        _id: workOrder.company_id,
      });

      if (company && !company.reg_id) {
        const regId = `REG${Date.now()}`;
        await db.collection('companies').updateOne(
          { _id: workOrder.company_id },
          {
            $set: {
              reg_id: regId,
              updatedAt: new Date(),
            },
          }
        );
        console.log('✅ Generated reg_id:', regId);
      }
    }

    // Log activity
    await db.collection('companyactivities').insertOne({
      company_id: workOrder.company_id,
      project_id: new ObjectId(projectId),
      description: woStatus === 1
        ? 'CII Approved Work Order Document'
        : 'CII Rejected Work Order Document',
      activity_type: 'cii',
      milestone_flow: 5,
      milestone_completed: woStatus === 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Activity logged (Milestone 5)');

    // Verify the update
    const verifyWorkOrder = await db.collection('companyworkorders').findOne({
      _id: new ObjectId(workOrderId),
    });

    console.log('🔍 Verification:', {
      wo_status: verifyWorkOrder.wo_status,
      wo_status_label: verifyWorkOrder.wo_status === 1 ? 'Approved' : verifyWorkOrder.wo_status === 2 ? 'Rejected' : 'Under Review',
      wo_remarks: verifyWorkOrder.wo_remarks,
      wo_doc_status_updated_at: verifyWorkOrder.wo_doc_status_updated_at,
    });

    console.log('\n✅ Work order approval completed successfully!');
    console.log('🔄 Refresh your frontend to see the updated status.');

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

approveWorkOrder();



