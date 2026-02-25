/**
 * Update Help Desk ticket status (and optional remarks) via MongoDB.
 * When status is set to "resolved", sets resolved_at and sends resolution email to the company.
 *
 * Usage:
 *   node scripts/update-help-desk-ticket-mongodb.js <ticketId> <status> [remarks]
 *   node scripts/update-help-desk-ticket-mongodb.js <ticketId> resolved "Issue fixed. Please try again."
 *   node scripts/update-help-desk-ticket-mongodb.js <path-to.json>
 *
 * Status: open | in_progress | resolved | closed
 *
 * Examples:
 *   node scripts/update-help-desk-ticket-mongodb.js 6789abc01234567890123456 resolved
 *   node scripts/update-help-desk-ticket-mongodb.js 6789abc01234567890123456 resolved "We have updated the limit. Please try again."
 *   node scripts/update-help-desk-ticket-mongodb.js 6789abc01234567890123456 in_progress
 *
 * JSON format (optional):
 * { "ticketId": "...", "status": "resolved", "remarks": "Resolution message.", "send_email": true }
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';
const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

function getDb(client) {
  try {
    const pathname = new URL(MONGODB_URI).pathname;
    const dbName = (pathname && pathname.length > 1 ? pathname.replace(/^\//, '') : null) || 'greenco_db';
    return client.db(dbName);
  } catch (_) {
    return client.db('greenco_db');
  }
}

async function sendResolutionEmail(to, companyName, ticketSubject, remarks) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  });
  await transporter.sendMail({
    from: process.env.MAIL_FROM_ADDRESS || 'noreply@greenco.com',
    to,
    subject: 'GreenCo Help Desk - Your query has been resolved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Help Desk – Query Resolved</h2>
        <p>Dear ${companyName || 'User'},</p>
        <p>Your help desk query has been resolved by GreenCo Admin.</p>
        <p><strong>Subject:</strong> ${ticketSubject}</p>
        <p><strong>Remarks / Resolution:</strong></p>
        <p>${remarks || 'No additional remarks provided.'}</p>
        <p>You can view all your tickets and status in the Help Desk section of the portal.</p>
        <p>Best regards,<br>Green Co Team</p>
      </div>
    `,
  });
}

async function run() {
  let ticketId = process.argv[2];
  let status = process.argv[3];
  let remarks = process.argv[4];
  let send_email = true;

  if (ticketId && ticketId.endsWith('.json')) {
    const resolved = path.resolve(process.cwd(), ticketId);
    if (!fs.existsSync(resolved)) {
      console.error('File not found:', resolved);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    ticketId = data.ticketId || data.ticket_id;
    status = data.status;
    remarks = data.remarks;
    if (typeof data.send_email === 'boolean') send_email = data.send_email;
  }

  if (!ticketId || !status) {
    console.error('Usage: node scripts/update-help-desk-ticket-mongodb.js <ticketId> <status> [remarks]');
    console.error('Status: open | in_progress | resolved | closed');
    process.exit(1);
  }

  status = status.toLowerCase().trim();
  if (!VALID_STATUSES.includes(status)) {
    console.error('Invalid status. Use one of:', VALID_STATUSES.join(', '));
    process.exit(1);
  }

  if (!/^[a-f0-9]{24}$/i.test(ticketId)) {
    console.error('Error: ticketId must be a 24-character hex string.');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = getDb(client);
  const ticketsColl = db.collection('helpdesktickets');
  const companiesColl = db.collection('companies');

  const ticket = await ticketsColl.findOne({ _id: new ObjectId(ticketId) });
  if (!ticket) {
    console.error('Ticket not found:', ticketId);
    process.exit(1);
  }

  const wasResolved = ticket.status === 'resolved';
  const update = {
    status,
    updatedAt: new Date(),
  };
  if (remarks !== undefined && remarks !== null) update.remarks = String(remarks).trim() || null;
  if (status === 'resolved') {
    update.resolved_at = new Date();
  }

  await ticketsColl.updateOne(
    { _id: new ObjectId(ticketId) },
    { $set: update },
  );

  const isNowResolved = status === 'resolved';
  if (isNowResolved && !wasResolved && send_email) {
    const company = await companiesColl.findOne(
      { _id: ticket.company_id },
      { projection: { email: 1, name: 1 } },
    );
    if (company && company.email) {
      try {
        await sendResolutionEmail(
          company.email,
          company.name || 'User',
          ticket.subject,
          update.remarks || ticket.remarks || '',
        );
        console.log('Resolution email sent to:', company.email);
      } catch (e) {
        console.error('Failed to send resolution email:', e.message);
      }
    } else {
      console.warn('Company email not found – resolution email not sent.');
    }
  }

  await client.close();
  console.log('');
  console.log('Done. Ticket updated:');
  console.log('  ticketId:', ticketId);
  console.log('  status:', status);
  if (remarks !== undefined) console.log('  remarks:', update.remarks ?? '(empty)');
  if (status === 'resolved') console.log('  resolved_at:', update.resolved_at);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
