/**
 * Script to fix next_activities_id for a project
 * 
 * Usage:
 * node scripts/fix-next-activities-id.js <projectId> <nextActivitiesId>
 * 
 * Examples:
 * node scripts/fix-next-activities-id.js 6994af7e1c64cedc200bd8ca 7
 * node scripts/fix-next-activities-id.js 6994af7e1c64cedc200bd8ca 6
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const projectId = process.argv[2];
const nextActivitiesId = parseInt(process.argv[3]);

if (!projectId || !nextActivitiesId) {
  console.error('❌ Usage: node scripts/fix-next-activities-id.js <projectId> <nextActivitiesId>');
  console.error('   Example: node scripts/fix-next-activities-id.js 6994af7e1c64cedc200bd8ca 7');
  process.exit(1);
}

if (nextActivitiesId < 1 || nextActivitiesId > 24) {
  console.error('❌ nextActivitiesId must be between 1 and 24');
  process.exit(1);
}

const milestoneSteps = {
  1: { name: 'Company Registered', responsibility: 'Company' },
  2: { name: 'Company Filled Registration Info', responsibility: 'Company' },
  3: { name: 'CII Uploaded Proposal Document', responsibility: 'CII' },
  4: { name: 'Company Uploaded Work Order Document', responsibility: 'Company' },
  5: { name: 'Work Order / Contract Document Accepted', responsibility: 'CII' },
  6: { name: 'CII to provide Project Code', responsibility: 'CII' },
  7: { name: 'Assign Project Co‑Ordinator', responsibility: 'CII' },
  8: { name: 'CII uploaded the PI/Tax Invoice', responsibility: 'CII' },
  9: { name: 'Company Paid Proforma Invoice', responsibility: 'Company' },
  10: { name: 'CII Acknowledged Proforma Invoice', responsibility: 'CII' },
  11: { name: 'Company Uploaded All Primary Data', responsibility: 'Company' },
  12: { name: 'CII Approved All Primary Data', responsibility: 'CII' },
  13: { name: 'All Checklist / Assessment Documents Uploaded by Company', responsibility: 'Company' },
  14: { name: 'CII Approved All Assessment Submittal', responsibility: 'CII' },
  15: { name: 'CII Assigned an Assessor', responsibility: 'CII' },
  16: { name: 'Preliminary Scoring submitted by CII', responsibility: 'CII' },
  17: { name: 'Final Scoring submitted (Rating Declaration)', responsibility: 'CII' },
  18: { name: 'Certificate Uploaded', responsibility: 'CII' },
  19: { name: '2nd Invoice uploaded', responsibility: 'CII' },
  20: { name: 'Payment Receipt of 2nd Invoice uploaded', responsibility: 'Company' },
  21: { name: 'Payment Receipt of 2nd Invoice acknowledged', responsibility: 'CII' },
  22: { name: 'Plaque & certificate dispatched', responsibility: 'CII' },
  23: { name: 'Feedback Report uploaded', responsibility: 'CII' },
  24: { name: 'Project close‑out / Sustenance phase', responsibility: 'Company' },
};

async function fixNextActivitiesId() {
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
      name: project.name,
      current_next_activities_id: project.next_activities_id,
      company_id: project.company_id?.toString(),
    });

    const nextStep = milestoneSteps[nextActivitiesId];
    console.log('🎯 Setting next_activities_id to:', {
      next_activities_id: nextActivitiesId,
      next_step_name: nextStep?.name,
      next_step_responsibility: nextStep?.responsibility,
    });

    // Update next_activities_id
    const updateResult = await db.collection('companyprojects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          next_activities_id: nextActivitiesId,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      console.error('❌ Failed to update next_activities_id');
      process.exit(1);
    }

    console.log('✅ next_activities_id updated successfully');

    // Verify the update
    const verifyProject = await db.collection('companyprojects').findOne({
      _id: new ObjectId(projectId),
    });

    console.log('🔍 Verification:', {
      projectId: verifyProject._id.toString(),
      updated_next_activities_id: verifyProject.next_activities_id,
      next_step_name: milestoneSteps[verifyProject.next_activities_id]?.name,
      next_step_responsibility: milestoneSteps[verifyProject.next_activities_id]?.responsibility,
    });

    // Check work order status if relevant
    if (nextActivitiesId >= 7) {
      const workOrder = await db.collection('companyworkorders').findOne({
        project_id: new ObjectId(projectId),
      });

      if (workOrder) {
        console.log('📋 Work Order Status:', {
          wo_status: workOrder.wo_status,
          wo_status_label: workOrder.wo_status === 0 ? 'Under Review' : workOrder.wo_status === 1 ? 'Approved' : workOrder.wo_status === 2 ? 'Rejected' : 'Unknown',
        });

        if (workOrder.wo_status !== 1 && nextActivitiesId >= 7) {
          console.log('⚠️  Warning: Work order is not approved (wo_status = 1), but next_activities_id is set to 7 or higher.');
          console.log('   This might cause inconsistencies. Consider approving the work order first.');
        }
      }
    }

    console.log('\n✅ Fix completed successfully!');
    console.log('🔄 Refresh your Quickview to see the updated next step.');
    console.log(`📝 Next Step: "${nextStep?.name}" (${nextStep?.responsibility})`);

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

fixNextActivitiesId();



