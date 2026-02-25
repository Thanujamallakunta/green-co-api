/**
 * List all coordinators from MongoDB so you can copy the _id
 * and use it with assign-coordinator-mongodb.js.
 *
 * Usage:
 *   node scripts/list-coordinators.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenco_db';

async function run() {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = new URL(MONGODB_URI).pathname.substring(1) || 'greenco_db';
    const db = client.db(dbName);

    const coll = db.collection('coordinators');

    const docs = await coll
      .find({
        $or: [{ status: '1' }, { status: 1 }, { status: { $exists: false } }],
      })
      .sort({ name: 1 })
      .toArray();

    if (!docs.length) {
      console.log('No coordinators found in collection `coordinators`.');
      return;
    }

    console.log('Coordinators (use the _id in assign script):\n');
    docs.forEach((c, idx) => {
      console.log(
        `${idx + 1}. _id=${c._id.toString()} | name=${c.name} | email=${c.email} | status=${c.status}`,
      );
    });
  } catch (err) {
    console.error('Error listing coordinators:', err.message || err);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

