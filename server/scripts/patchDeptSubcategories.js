#!/usr/bin/env node
/**
 * PATCH — Backfill supportedCategories on existing departments
 *
 * Run once to populate the {name, sla} subcategory data on departments
 * that were created before this field existed.
 *
 * Usage:
 *   cd server
 *   node scripts/patchDeptSubcategories.js
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const mongoose   = require('mongoose');
const Department = require('../models/Department');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/grievance_portal';

// ─── Data from Excel ────────────────────────────────────────────────
const PATCH_DATA = {
  road_department: [
    { name: 'Pothole',                       sla: '2-3 Days'  },
    { name: 'Surface Damage',                sla: '7-15 Days' },
    { name: 'Speed Breaker Repair',           sla: '3-7 Days'  },
    { name: 'Missing Road Signboard',         sla: '3-5 Days'  },
    { name: 'Divider Damage',                 sla: '7-15 Days' },
    { name: 'Manhole Cover Damage',            sla: '1-3 Days'  },
    { name: 'Road Marking / Zebra Crossing',  sla: '7-15 Days' },
  ],
  sanitation_department: [
    { name: 'Garbage Not Collected',       sla: '1-2 Days'  },
    { name: 'Drainage Blockage',           sla: '2-4 Days'  },
    { name: 'Dead Animal Removal',         sla: 'Same Day'  },
    { name: 'Public Toilet Cleaning',      sla: '1 Day'     },
    { name: 'Water Logging (Minor)',       sla: '2-5 Days'  },
    { name: 'Open Drain Cleaning',         sla: '2-5 Days'  },
    { name: 'Mosquito Breeding Issue',     sla: '2-3 Days'  },
    { name: 'Broken Dustbin Replacement',  sla: '3-7 Days'  },
  ],
  electricity_department: [
    { name: 'Street Light Not Working',    sla: '2-3 Days'  },
    { name: 'Open/Loose Electric Wire',    sla: 'Same Day'  },
    { name: 'Electric Pole Damage',        sla: '3-7 Days'  },
    { name: 'Transformer Issue',           sla: '1-3 Days'  },
    { name: 'Cable Fault',                 sla: '1-3 Days'  },
  ],
};

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const [code, subcategories] of Object.entries(PATCH_DATA)) {
      const dept = await Department.findOne({ code });
      if (!dept) {
        console.log(`⏭️  Department "${code}" not found — skipping`);
        continue;
      }

      // Only patch if supportedCategories is empty or has old string format
      const needsPatch = !dept.supportedCategories ||
        dept.supportedCategories.length === 0 ||
        (dept.supportedCategories.length > 0 && typeof dept.supportedCategories[0] === 'string');

      if (!needsPatch) {
        console.log(`⏭️  ${dept.name} already has ${dept.supportedCategories.length} subcategories — skipping`);
        continue;
      }

      dept.supportedCategories = subcategories;
      await dept.save();
      console.log(`✅ ${dept.name} — patched with ${subcategories.length} subcategories`);
    }

    console.log('\n✅ Patch complete!');
  } catch (err) {
    console.error('❌ Patch failed:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

run();
