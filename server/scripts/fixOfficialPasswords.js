/**
 * Fix double-hashed passwords for imported officials.
 *
 * The importDepartments.js script pre-hashed passwords with bcrypt(10)
 * and then Admin.create() re-hashed them via the pre-save hook (bcrypt 12).
 * This means bcrypt.compare('Pass@123', storedHash) fails.
 *
 * This script finds every official where Pass@123 doesn't match,
 * sets their password to plain 'Pass@123', and lets the pre-save hook
 * hash it correctly (single hash).
 *
 * Usage:  node scripts/fixOfficialPasswords.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const Admin    = require('../models/Admin');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DEFAULT_PASSWORD = 'Pass@123';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  const officials = await Admin.find({ role: { $in: ['department_head', 'officer'] } });
  let fixed = 0;
  let skipped = 0;

  for (const official of officials) {
    const matches = await bcrypt.compare(DEFAULT_PASSWORD, official.password);
    if (matches) {
      skipped++;
      console.log(`  ✓ SKIP  ${official.name.padEnd(25)} ${official.email.padEnd(30)} (already correct)`);
      continue;
    }

    // Reset password — pre-save hook will hash it properly
    official.password = DEFAULT_PASSWORD;
    await official.save();

    // Verify
    const verify = await bcrypt.compare(DEFAULT_PASSWORD, official.password);
    if (verify) {
      fixed++;
      console.log(`  ✅ FIXED ${official.name.padEnd(25)} ${official.email.padEnd(30)}`);
    } else {
      console.log(`  ❌ FAIL  ${official.name.padEnd(25)} ${official.email.padEnd(30)} (still broken!)`);
    }
  }

  console.log(`\nDone — Fixed: ${fixed}, Already OK: ${skipped}, Total: ${officials.length}`);
  await mongoose.connection.close();
}

run().catch(e => { console.error(e); process.exit(1); });
