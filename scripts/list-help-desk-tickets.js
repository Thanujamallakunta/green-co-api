/**
 * List Help Desk tickets from MongoDB (to get ticketId for update-help-desk-ticket-mongodb.js).
 *
 * Usage:
 *   node scripts/list-help-desk-tickets.js
 *   node scripts/list-help-desk-tickets.js --status open
 *   node scripts/list-help-desk-tickets.js 10
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco_db';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco_db');
  }
}

async function run() {
  const limit = parseInt(process.argv[2], 10) || 20;
  const statusArg = process.argv.find((a) => a.startsWith('--status='));
  const status = statusArg ? statusArg.replace(/^--status=/, '') : null;

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const ticketsColl = db.collection('helpdesktickets');
  const companiesColl = db.collection('companies');

  const filter = status ? { status } : {};
  const tickets = await ticketsColl
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (tickets.length === 0) {
    console.log('No help desk tickets found.');
    if (status) console.log('(Filter: status =', status + ')');
    await client.close();
    return;
  }

  const companyIds = [...new Set(tickets.map((t) => t.company_id && (typeof t.company_id.toString === 'function' ? t.company_id.toString() : String(t.company_id))).filter(Boolean))];
  const companies = companyIds.length
    ? await companiesColl.find({ _id: { $in: companyIds.map((id) => new ObjectId(id)) } }).project({ _id: 1, email: 1, name: 1 }).lean()
    : [];
  const companyMap = {};
  companies.forEach((c) => {
    companyMap[c._id.toString()] = c;
  });

  console.log('');
  console.log('Help Desk tickets (use _id as ticketId for update script):');
  console.log('');
  tickets.forEach((t) => {
    const c = companyMap[t.company_id?.toString()];
    const created = t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 19) : '-';
    console.log('  ticketId:', t._id.toString());
    console.log('  subject: ', t.subject);
    console.log('  status:  ', t.status);
    console.log('  company: ', c ? (c.name || c.email) : t.company_id);
    console.log('  created: ', created);
    console.log('');
  });

  console.log('To update status: node scripts/update-help-desk-ticket-mongodb.js <ticketId> <status> [remarks]');
  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
