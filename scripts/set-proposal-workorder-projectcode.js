/**
 * Set proposal document, work order document, and/or project code (project_id) via MongoDB.
 * Use when you have files on disk or want to set project code without going through the API.
 *
 * Paths (relative to project root or full URL):
 * - Proposal:  uploads/company/{projectId}/proposal.pdf  (or any filename)
 * - Work order: uploads/companyproject/{projectId}/workorder.pdf  (or any filename)
 *
 * Usage:
 *   node scripts/set-proposal-workorder-projectcode.js <projectId> [options]
 *
 * Options (all optional; provide only what you want to set):
 *   --proposal <pathOrUrl>     e.g. uploads/company/6994af7e1c64cedc200bd8ca/proposal.pdf
 *   --workorder <pathOrUrl>    e.g. uploads/companyproject/6994af7e1c64cedc200bd8ca/workorder.pdf
 *   --projectcode <code>       e.g. PROJ-2024-001  (must be unique)
 *
 * Examples:
 *   node scripts/set-proposal-workorder-projectcode.js 6994af7e1c64cedc200bd8ca --proposal uploads/company/6994af7e1c64cedc200bd8ca/proposal.pdf
 *   node scripts/set-proposal-workorder-projectcode.js 6994af7e1c64cedc200bd8ca --workorder uploads/companyproject/6994af7e1c64cedc200bd8ca/workorder.pdf
 *   node scripts/set-proposal-workorder-projectcode.js 6994af7e1c64cedc200bd8ca --projectcode GC2024001
 *   node scripts/set-proposal-workorder-projectcode.js 6994af7e1c64cedc200bd8ca --proposal uploads/company/6994af7e1c64cedc200bd8ca/proposal.pdf --workorder uploads/companyproject/6994af7e1c64cedc200bd8ca/workorder.pdf --projectcode GC2024001
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco';

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco');
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const projectIdRaw = args[0];
  const opts = { proposal: null, workorder: null, projectcode: null };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--proposal' && args[i + 1]) {
      opts.proposal = args[i + 1];
      i++;
    } else if (args[i] === '--workorder' && args[i + 1]) {
      opts.workorder = args[i + 1];
      i++;
    } else if (args[i] === '--projectcode' && args[i + 1]) {
      opts.projectcode = args[i + 1];
      i++;
    }
  }
  return { projectIdRaw, ...opts };
}

async function run() {
  const { projectIdRaw, proposal, workorder, projectcode } = parseArgs();

  if (!projectIdRaw) {
    console.error('Usage: node scripts/set-proposal-workorder-projectcode.js <projectId> [--proposal <path>] [--workorder <path>] [--projectcode <code>]');
    process.exit(1);
  }

  if (!proposal && !workorder && !projectcode) {
    console.error('Provide at least one of: --proposal <path> --workorder <path> --projectcode <code>');
    process.exit(1);
  }

  let projectIdObj;
  try {
    projectIdObj = new ObjectId(projectIdRaw);
  } catch (_) {
    console.error('Invalid projectId (must be 24-char hex ObjectId):', projectIdRaw);
    process.exit(1);
  }

  if (projectcode && !/^[A-Za-z0-9_-]{3,50}$/.test(projectcode)) {
    console.error('Invalid project code (3–50 chars, letters, numbers, hyphen, underscore):', projectcode);
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const projectsColl = db.collection('companyprojects');
  const workOrdersColl = db.collection('companyworkorders');
  const activitiesColl = db.collection('companyactivities');

  const project = await projectsColl.findOne({ _id: projectIdObj });
  if (!project) {
    console.error('Project not found:', projectIdRaw);
    await client.close();
    process.exit(1);
  }

  const companyId = project.company_id;
  const updates = {};
  const now = new Date();

  if (proposal) {
    updates.proposal_document = proposal.startsWith('http') ? proposal : proposal.replace(/^\/+/, '');
    console.log('Will set proposal_document:', updates.proposal_document);
  }

  if (projectcode) {
    const existing = await projectsColl.findOne({
      project_id: projectcode,
      _id: { $ne: projectIdObj },
    });
    if (existing) {
      console.error('Project code already in use by another project:', projectcode);
      await client.close();
      process.exit(1);
    }
    updates.project_id = projectcode;
    console.log('Will set project_id (project code):', projectcode);
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = now;
    await projectsColl.updateOne({ _id: projectIdObj }, { $set: updates });
    console.log('Updated companyprojects:', Object.keys(updates).filter((k) => k !== 'updatedAt'));
  }

  if (workorder) {
    const woPath = workorder.startsWith('http') ? workorder : workorder.replace(/^\/+/, '');
    const existingWo = await workOrdersColl.findOne({
      company_id: companyId,
      project_id: projectIdObj,
    });
    if (existingWo) {
      await workOrdersColl.updateOne(
        { _id: existingWo._id },
        {
          $set: {
            wo_doc: woPath,
            wo_status: 0,
            wo_doc_status_updated_at: now,
            updatedAt: now,
          },
        },
      );
      console.log('Updated existing work order wo_doc:', woPath);
    } else {
      await workOrdersColl.insertOne({
        company_id: companyId,
        project_id: projectIdObj,
        wo_doc: woPath,
        wo_status: 0,
        wo_doc_status_updated_at: now,
        createdAt: now,
        updatedAt: now,
      });
      console.log('Inserted new work order wo_doc:', woPath);
    }
  }

  // Optional: ensure milestone 3 (proposal) and 4 (work order) activities exist if we set those docs
  if (proposal) {
    const hasMilestone3 = await activitiesColl.findOne({
      company_id: companyId,
      project_id: projectIdObj,
      milestone_flow: 3,
    });
    if (!hasMilestone3) {
      await activitiesColl.insertOne({
        company_id: companyId,
        project_id: projectIdObj,
        description: 'CII Uploaded Proposal Document',
        activity_type: 'cii',
        milestone_flow: 3,
        milestone_completed: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log('Created activity: CII Uploaded Proposal Document (milestone 3)');
    }
  }

  if (workorder) {
    const hasMilestone4 = await activitiesColl.findOne({
      company_id: companyId,
      project_id: projectIdObj,
      milestone_flow: 4,
    });
    if (!hasMilestone4) {
      await activitiesColl.insertOne({
        company_id: companyId,
        project_id: projectIdObj,
        description: 'Company Uploaded Work Order Document',
        activity_type: 'company',
        milestone_flow: 4,
        milestone_completed: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log('Created activity: Company Uploaded Work Order Document (milestone 4)');
    }
  }

  // If we set project code, optionally bump next_activities_id and log milestone 6
  if (projectcode) {
    const hasMilestone6 = await activitiesColl.findOne({
      company_id: companyId,
      project_id: projectIdObj,
      milestone_flow: 6,
    });
    if (!hasMilestone6) {
      await activitiesColl.insertOne({
        company_id: companyId,
        project_id: projectIdObj,
        description: 'CII to provide Project Code',
        activity_type: 'cii',
        milestone_flow: 6,
        milestone_completed: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log('Created activity: CII to provide Project Code (milestone 6)');
    }
    const nextId = Math.min(24, 7);
    const cur = project.next_activities_id || 0;
    if (cur < nextId) {
      await projectsColl.updateOne(
        { _id: projectIdObj },
        { $set: { next_activities_id: nextId, updatedAt: now } },
      );
      console.log('Set next_activities_id to', nextId);
    }
  }

  const updatedProject = await projectsColl.findOne({ _id: projectIdObj });
  console.log('\nCurrent project fields:');
  console.log('  proposal_document:', updatedProject.proposal_document || '(not set)');
  console.log('  project_id (code):', updatedProject.project_id || '(not set)');
  const wo = await workOrdersColl.findOne({ project_id: projectIdObj });
  console.log('  work order wo_doc:', wo?.wo_doc || '(none)');

  await client.close();
  console.log('\nDone.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
