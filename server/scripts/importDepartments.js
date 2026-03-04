#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 * DEPARTMENT IMPORT & USER PROVISIONING SCRIPT
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Safe, idempotent migration script for the Municipal Grievance Portal.
 *
 * What it does:
 *   1. Clears old departments & department_head / officer Admin records
 *   2. Creates 3 new departments (Road, Sanitation, Electricity)
 *   3. Creates department heads (role: department_head)
 *   4. Creates officers (role: officer) with designations
 *   5. Populates CategoryMapping (AI safe layer)
 *   6. Logs a full summary
 *
 * What it does NOT touch:
 *   - complaints collection
 *   - citizens collection
 *   - super_admin / admin accounts
 *   - AI model or prediction code
 *
 * Usage:
 *   cd server
 *   node scripts/importDepartments.js
 *
 * Environment:
 *   Requires MONGODB_URI (or MONGO_URI) environment variable,
 *   or falls back to mongodb://localhost:27017/grievance_portal
 * ═══════════════════════════════════════════════════════════════════════
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const mongoose  = require('mongoose');
// bcrypt not needed — Admin model pre-save hook handles password hashing
const path      = require('path');

// ─── Models ──────────────────────────────────────────────────────────
const Admin           = require('../models/Admin');
const Department      = require('../models/Department');
const CategoryMapping = require('../models/CategoryMapping');

// ─── Config ──────────────────────────────────────────────────────────
const MONGO_URI       = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/grievance_portal';
const DEFAULT_PASSWORD = 'Pass@123';
// NOTE: Do NOT pre-hash — Admin model's pre-save hook handles bcrypt hashing.

// ═══════════════════════════════════════════════════════════════════════
//  DATA — embedded from Excel files provided by the client
// ═══════════════════════════════════════════════════════════════════════

const DEPARTMENTS = [
  {
    name: 'Road Department (PWD)',
    code: 'road_department',
    description: 'Public Works Department — handles road damage, potholes, signage, dividers, manholes, and infrastructure issues',
    subcategories: [
      { name: 'Pothole',                       sla: '2-3 Days'  },
      { name: 'Surface Damage',                sla: '7-15 Days' },
      { name: 'Speed Breaker Repair',           sla: '3-7 Days'  },
      { name: 'Missing Road Signboard',         sla: '3-5 Days'  },
      { name: 'Divider Damage',                 sla: '7-15 Days' },
      { name: 'Manhole Cover Damage',            sla: '1-3 Days'  },
      { name: 'Road Marking / Zebra Crossing',  sla: '7-15 Days' },
    ],
    head: {
      designation: 'Road Department / PWD Head',
      name:  'Er. Rajesh Deshmukh',
      email: 'rajesh.d@gmail.com',
      phone: '9876500001',
    },
    officers: [
      { designation: 'Executive Engineer',  name: 'Er. Amit Kulkarni',   email: 'amitk@gmail.com',    phone: '9876500002' },
      { designation: 'Executive Engineer',  name: 'Er. Pravin Patil',    email: 'pravinp@gmail.com',   phone: '9876500003' },
      { designation: 'Assistant Engineer',  name: 'Er. Sneha Joshi',     email: 'snehaj@gmail.com',    phone: '9876500004' },
      { designation: 'Assistant Engineer',  name: 'Er. Nikhil Shinde',   email: 'nikhils@gmail.com',   phone: '9876500005' },
      { designation: 'Junior Engineer',     name: 'Er. Rohan Wankhede',  email: 'rohanw@gmail.com',    phone: '9876500006' },
      { designation: 'Junior Engineer',     name: 'Er. Pooja Kale',      email: 'poojak@gmail.com',    phone: '9876500007' },
      { designation: 'Section Officer',     name: 'Mahesh Pawar',        email: 'maheshp@gmail.com',   phone: '9876500008' },
      { designation: 'Section Officer',     name: 'Ganesh More',         email: 'ganeshm@gmail.com',   phone: '9876500009' },
      { designation: 'Senior Clerk',        name: 'Suresh Thakre',       email: 'suresht@gmail.com',   phone: '9876500010' },
      { designation: 'Clerk',               name: 'Kavita Bhosale',      email: 'kavitab@gmail.com',   phone: '9876500011' },
      { designation: 'Clerk',               name: 'Rahul Gawande',       email: 'rahulg@gmail.com',    phone: '9876500012' },
      { designation: 'Clerk',               name: 'Neha Ingle',          email: 'nehai@gmail.com',     phone: '9876500013' },
    ],
  },
  {
    name: 'Sanitation Department',
    code: 'sanitation_department',
    description: 'Solid Waste Management & Sanitation — handles garbage, drainage, public toilets, waterlogging, pest control',
    subcategories: [
      { name: 'Garbage Not Collected',       sla: '1-2 Days'  },
      { name: 'Drainage Blockage',           sla: '2-4 Days'  },
      { name: 'Dead Animal Removal',         sla: 'Same Day'  },
      { name: 'Public Toilet Cleaning',      sla: '1 Day'     },
      { name: 'Water Logging (Minor)',       sla: '2-5 Days'  },
      { name: 'Open Drain Cleaning',         sla: '2-5 Days'  },
      { name: 'Mosquito Breeding Issue',     sla: '2-3 Days'  },
      { name: 'Broken Dustbin Replacement',  sla: '3-7 Days'  },
    ],
    head: {
      designation: 'Health Officer / Sanitation Head',
      name:  'Dr. Sunil Patwardhan',
      email: 'sunilp@gmail.com',
      phone: '9876500101',
    },
    officers: [
      { designation: 'Executive Health Officer',  name: 'Dr. Meena Tiwari',   email: 'meenat@gmail.com',    phone: '9876500102' },
      { designation: 'Assistant Health Officer',  name: 'Dr. Ajay Ingole',    email: 'ajayi@gmail.com',     phone: '9876500103' },
      { designation: 'Sanitary Inspector',        name: 'Rakesh Jadhav',      email: 'rakeshj@gmail.com',   phone: '9876500104' },
      { designation: 'Sanitary Inspector',        name: 'Lata Bhure',         email: 'latab@gmail.com',     phone: '9876500105' },
      { designation: 'Ward Supervisor',           name: 'Shailesh Pande',     email: 'shaileshp@gmail.com', phone: '9876500106' },
      { designation: 'Ward Supervisor',           name: 'Pritam Dange',       email: 'pritamd@gmail.com',   phone: '9876500107' },
      { designation: 'Field Officer',             name: 'Sagar Kadu',         email: 'sagark@gmail.com',    phone: '9876500108' },
      { designation: 'Field Officer',             name: 'Komal Mahalle',      email: 'komalm@gmail.com',    phone: '9876500109' },
      { designation: 'Senior Clerk',              name: 'Vijay Waghmare',     email: 'vijayw@gmail.com',    phone: '9876500110' },
      { designation: 'Clerk',                     name: 'Aarti Rathod',       email: 'aartir@gmail.com',    phone: '9876500111' },
      { designation: 'Clerk',                     name: 'Deepak Meshram',     email: 'deepakm@gmail.com',   phone: '9876500112' },
      { designation: 'Clerk',                     name: 'Swati Rode',         email: 'swatir@gmail.com',    phone: '9876500113' },
    ],
  },
  {
    name: 'Electricity Department',
    code: 'electricity_department',
    description: 'Street Light & Electrical Department — handles street lights, wiring, poles, transformers, cables',
    subcategories: [
      { name: 'Street Light Not Working',    sla: '2-3 Days'  },
      { name: 'Open/Loose Electric Wire',    sla: 'Same Day'  },
      { name: 'Electric Pole Damage',        sla: '3-7 Days'  },
      { name: 'Transformer Issue',           sla: '1-3 Days'  },
      { name: 'Cable Fault',                 sla: '1-3 Days'  },
    ],
    head: {
      designation: 'Electrical Engineer / Dept Head',
      name:  'Er. Vivek Bhandari',
      email: 'vivekb@gmail.com',
      phone: '9876500201',
    },
    officers: [
      { designation: 'Executive Engineer',    name: 'Er. Manoj Kapse',       email: 'manojk@gmail.com',    phone: '9876500202' },
      { designation: 'Assistant Engineer',    name: 'Er. Priyanka Dhore',    email: 'priyankad@gmail.com', phone: '9876500203' },
      { designation: 'Assistant Engineer',    name: 'Er. Hemant Barve',      email: 'hemantb@gmail.com',   phone: '9876500204' },
      { designation: 'Junior Engineer',       name: 'Er. Akash Bhagat',      email: 'akashb@gmail.com',    phone: '9876500205' },
      { designation: 'Junior Engineer',       name: 'Er. Shweta Raut',       email: 'shwetar@gmail.com',   phone: '9876500206' },
      { designation: 'Electrical Inspector',  name: 'Sanjay Kothari',        email: 'sanjayk@gmail.com',   phone: '9876500207' },
      { designation: 'Line Supervisor',       name: 'Nitin Dhok',            email: 'nitind@gmail.com',    phone: '9876500208' },
      { designation: 'Line Supervisor',       name: 'Amol Rane',             email: 'amolr@gmail.com',     phone: '9876500209' },
      { designation: 'Senior Clerk',          name: 'Prakash Bhalerao',      email: 'prakashb@gmail.com',  phone: '9876500210' },
      { designation: 'Clerk',                 name: 'Seema Yadav',           email: 'seemay@gmail.com',    phone: '9876500211' },
      { designation: 'Clerk',                 name: 'Rohit Khandekar',       email: 'rohitk@gmail.com',    phone: '9876500212' },
      { designation: 'Clerk',                 name: 'Anita Korde',           email: 'anitak@gmail.com',    phone: '9876500213' },
      { designation: 'Technician',            name: 'Sandeep More',          email: 'sandeepm@gmail.com',  phone: '9876500214' },
      { designation: 'Technician',            name: 'Yogesh Patil',          email: 'yogeshp@gmail.com',   phone: '9876500215' },
    ],
  },
];

// ─── Sub-category → Department mapping (from Excel image) ────────────
const SUB_CATEGORY_MAPPINGS = [
  // Road Department (PWD)
  { categoryName: 'Pothole',                       departmentCode: 'road_department',        slaDuration: '2–3 Days'  },
  { categoryName: 'Surface Damage',                departmentCode: 'road_department',        slaDuration: '7–15 Days' },
  { categoryName: 'Speed Breaker Repair',           departmentCode: 'road_department',        slaDuration: '3–7 Days'  },
  { categoryName: 'Missing Road Signboard',         departmentCode: 'road_department',        slaDuration: '3–5 Days'  },
  { categoryName: 'Divider Damage',                 departmentCode: 'road_department',        slaDuration: '7–15 Days' },
  { categoryName: 'Manhole Cover Damage',            departmentCode: 'road_department',        slaDuration: '1–3 Days'  },
  { categoryName: 'Road Marking / Zebra Crossing',  departmentCode: 'road_department',        slaDuration: '7–15 Days' },

  // Sanitation Department
  { categoryName: 'Garbage Not Collected',           departmentCode: 'sanitation_department',  slaDuration: '1–2 Days'  },
  { categoryName: 'Drainage Blockage',               departmentCode: 'sanitation_department',  slaDuration: '2–4 Days'  },
  { categoryName: 'Dead Animal Removal',             departmentCode: 'sanitation_department',  slaDuration: 'Same Day'  },
  { categoryName: 'Public Toilet Cleaning',          departmentCode: 'sanitation_department',  slaDuration: '1 Day'     },
  { categoryName: 'Water Logging (Minor)',           departmentCode: 'sanitation_department',  slaDuration: '2–5 Days'  },
  { categoryName: 'Open Drain Cleaning',             departmentCode: 'sanitation_department',  slaDuration: '2–5 Days'  },
  { categoryName: 'Mosquito Breeding Issue',         departmentCode: 'sanitation_department',  slaDuration: '2–3 Days'  },
  { categoryName: 'Broken Dustbin Replacement',      departmentCode: 'sanitation_department',  slaDuration: '3–7 Days'  },

  // Electricity Department
  { categoryName: 'Street Light Not Working',        departmentCode: 'electricity_department', slaDuration: '2–3 Days'  },
  { categoryName: 'Open/Loose Electric Wire',        departmentCode: 'electricity_department', slaDuration: 'Same Day'  },
  { categoryName: 'Electric Pole Damage',            departmentCode: 'electricity_department', slaDuration: '3–7 Days'  },
  { categoryName: 'Transformer Issue',               departmentCode: 'electricity_department', slaDuration: '1–3 Days'  },
  { categoryName: 'Cable Fault',                     departmentCode: 'electricity_department', slaDuration: '1–3 Days'  },
];

// ─── AI-predicted category → Department mapping ─────────────────────
const AI_CATEGORY_MAPPINGS = [
  { categoryName: 'Damaged Road Issue',       departmentCode: 'road_department',        slaDuration: '3–5 Days',  source: 'ai' },
  { categoryName: 'Garbage and Trash Issue',  departmentCode: 'sanitation_department',  slaDuration: '1–2 Days',  source: 'ai' },
  { categoryName: 'Street Light Issue',       departmentCode: 'electricity_department', slaDuration: '2–3 Days',  source: 'ai' },
  { categoryName: 'Fallen Trees',             departmentCode: 'sanitation_department',  slaDuration: '1–3 Days',  source: 'ai' },
  { categoryName: 'Illegal Drawing on Walls', departmentCode: 'road_department',        slaDuration: '4–6 Days',  source: 'ai' },
  { categoryName: 'Other',                    departmentCode: 'road_department',        slaDuration: '3–5 Days',  source: 'ai' },
];

// ─── Legacy category → Department mapping ────────────────────────────
const LEGACY_CATEGORY_MAPPINGS = [
  { categoryName: 'DamagedRoads',           departmentCode: 'road_department',        slaDuration: '3–5 Days',  source: 'legacy' },
  { categoryName: 'ElectricityIssues',      departmentCode: 'electricity_department', slaDuration: '2–3 Days',  source: 'legacy' },
  { categoryName: 'GarbageAndSanitation',   departmentCode: 'sanitation_department',  slaDuration: '1–2 Days',  source: 'legacy' },
  { categoryName: 'road_damage',            departmentCode: 'road_department',        slaDuration: '3–5 Days',  source: 'legacy' },
  { categoryName: 'street_light',           departmentCode: 'electricity_department', slaDuration: '2–3 Days',  source: 'legacy' },
  { categoryName: 'water_supply',           departmentCode: 'sanitation_department',  slaDuration: '2–4 Days',  source: 'legacy' },
  { categoryName: 'sewage',                 departmentCode: 'sanitation_department',  slaDuration: '2–4 Days',  source: 'legacy' },
  { categoryName: 'garbage',                departmentCode: 'sanitation_department',  slaDuration: '1–2 Days',  source: 'legacy' },
  { categoryName: 'encroachment',           departmentCode: 'road_department',        slaDuration: '7–15 Days', source: 'legacy' },
  { categoryName: 'noise_pollution',        departmentCode: 'road_department',        slaDuration: '3–5 Days',  source: 'legacy' },
  { categoryName: 'illegal_construction',   departmentCode: 'road_department',        slaDuration: '7–15 Days', source: 'legacy' },
  { categoryName: 'traffic',                departmentCode: 'road_department',        slaDuration: '3–5 Days',  source: 'legacy' },
  { categoryName: 'other',                  departmentCode: 'road_department',        slaDuration: '3–5 Days',  source: 'legacy' },
];

// ═══════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function log(msg) { console.log(`  ${msg}`); }
function logSection(title) { console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`); }

// Password hashing is handled by the Admin model's pre-save hook.
// No manual hashing needed here.

/**
 * Default permissions for department_head
 */
const HEAD_PERMISSIONS = {
  canViewComplaints:  true,
  canUpdateStatus:    true,
  canAssignComplaints: true,
  canDeleteComplaints: false,
  canManageAdmins:    false,
  canViewAnalytics:   true,
  canExportData:      true,
};

/**
 * Default permissions for officer
 */
const OFFICER_PERMISSIONS = {
  canViewComplaints:  true,
  canUpdateStatus:    true,
  canAssignComplaints: false,
  canDeleteComplaints: false,
  canManageAdmins:    false,
  canViewAnalytics:   false,
  canExportData:      false,
};

// ═══════════════════════════════════════════════════════════════════════
//  MAIN MIGRATION
// ═══════════════════════════════════════════════════════════════════════

async function runMigration() {
  const summary = {
    departmentsCreated: 0,
    headsCreated:       0,
    officersCreated:    0,
    mappingsCreated:    0,
    errors:             [],
  };

  try {
    // ── 1. Connect ─────────────────────────────────────────────────
    logSection('STEP 1 — Connecting to MongoDB');
    await mongoose.connect(MONGO_URI);
    log('✅ Connected to MongoDB');

    // ── 2. Pre-flight checks ───────────────────────────────────────
    logSection('STEP 2 — Pre-flight checks');

    const complaintCount = await mongoose.connection.collection('grievances').countDocuments();
    log(`📋 Existing complaints: ${complaintCount} (will NOT be touched)`);

    const superAdminCount = await Admin.countDocuments({ role: { $in: ['super_admin', 'admin'] } });
    log(`👤 Existing super_admin/admin accounts: ${superAdminCount} (will NOT be touched)`);

    const citizenCollection = mongoose.connection.collections['citizens'];
    const citizenCount = citizenCollection ? await citizenCollection.countDocuments() : 0;
    log(`🏛️  Existing citizens: ${citizenCount} (will NOT be touched)`);

    // ── 3. Safe cleanup — remove ONLY departments + head/officer admins ──
    logSection('STEP 3 — Safe cleanup');

    const oldDeptCount = await Department.countDocuments();
    await Department.deleteMany({});
    log(`🗑️  Deleted ${oldDeptCount} old department record(s)`);

    const oldHeads = await Admin.countDocuments({ role: 'department_head' });
    await Admin.deleteMany({ role: 'department_head' });
    log(`🗑️  Deleted ${oldHeads} old department_head record(s)`);

    const oldOfficers = await Admin.countDocuments({ role: 'officer' });
    await Admin.deleteMany({ role: 'officer' });
    log(`🗑️  Deleted ${oldOfficers} old officer record(s)`);

    // Clear old category mappings (safe — complaints already have dept snapshot)
    const oldMappings = await CategoryMapping.countDocuments();
    await CategoryMapping.deleteMany({});
    log(`🗑️  Deleted ${oldMappings} old category mapping(s)`);

    log('✅ Cleanup complete — complaints, citizens, and admin accounts preserved');

    // ── 4. Password setup ──────────────────────────────────────────
    logSection('STEP 4 — Password (plain text, hashed by pre-save hook)');
    const plainPassword = DEFAULT_PASSWORD;
    log(`🔒 Default password: "${DEFAULT_PASSWORD}" (hashed automatically on save)`);

    // ── 5. Create departments ──────────────────────────────────────
    logSection('STEP 5 — Creating departments');

    const deptMap = {}; // code → Department doc (for use in later steps)

    for (const dept of DEPARTMENTS) {
      const newDept = await Department.create({
        name:        dept.name,
        code:        dept.code,
        description: dept.description,
        headName:    dept.head.name,
        headEmail:   dept.head.email,
        headPhone:   dept.head.phone,
        supportedCategories: dept.subcategories || [],
        isActive:    true,
      });
      deptMap[dept.code] = newDept;
      summary.departmentsCreated++;
      log(`  ✅ ${dept.name}  (code: ${dept.code}, _id: ${newDept._id})`);
    }

    // ── 6. Create department head logins ───────────────────────────
    logSection('STEP 6 — Creating department head logins');

    for (const dept of DEPARTMENTS) {
      const deptDoc = deptMap[dept.code];
      const head = dept.head;

      try {
        const headAdmin = await Admin.create({
          name:           head.name,
          email:          head.email,
          password:       plainPassword,
          phone:          head.phone,
          role:           'department_head',
          department:     dept.code,
          departmentCode: dept.code,
          departmentRef:  deptDoc._id,
          designation:    head.designation,
          isActive:       true,
          permissions:    HEAD_PERMISSIONS,
        });
        summary.headsCreated++;
        log(`  ✅ HEAD  ${head.name}  <${head.email}>  dept=${dept.code}  _id=${headAdmin._id}`);
      } catch (err) {
        const msg = `Failed to create head ${head.email}: ${err.message}`;
        summary.errors.push(msg);
        log(`  ❌ ${msg}`);
      }
    }

    // ── 7. Create officer logins ───────────────────────────────────
    logSection('STEP 7 — Creating officer logins');

    for (const dept of DEPARTMENTS) {
      const deptDoc = deptMap[dept.code];
      log(`\n  📂 ${dept.name} (${dept.officers.length} officers)`);

      for (const officer of dept.officers) {
        try {
          const officerAdmin = await Admin.create({
            name:           officer.name,
            email:          officer.email,
            password:       plainPassword,
            phone:          officer.phone,
            role:           'officer',
            department:     dept.code,
            departmentCode: dept.code,
            departmentRef:  deptDoc._id,
            designation:    officer.designation,
            isActive:       true,
            permissions:    OFFICER_PERMISSIONS,
          });
          summary.officersCreated++;
          log(`     ✅ ${officer.designation.padEnd(26)} ${officer.name.padEnd(24)} <${officer.email}>`);
        } catch (err) {
          const msg = `Failed to create officer ${officer.email}: ${err.message}`;
          summary.errors.push(msg);
          log(`     ❌ ${msg}`);
        }
      }
    }

    // ── 8. Create CategoryMapping entries ──────────────────────────
    logSection('STEP 8 — Creating CategoryMapping entries');

    const allMappings = [
      ...SUB_CATEGORY_MAPPINGS.map(m => ({ ...m, source: 'manual' })),
      ...AI_CATEGORY_MAPPINGS,
      ...LEGACY_CATEGORY_MAPPINGS,
    ];

    for (const m of allMappings) {
      const deptDoc = deptMap[m.departmentCode];
      try {
        await CategoryMapping.create({
          categoryName:   m.categoryName,
          departmentId:   deptDoc ? deptDoc._id : null,
          departmentName: deptDoc ? deptDoc.name : m.departmentCode,
          departmentCode: m.departmentCode,
          slaDuration:    m.slaDuration,
          source:         m.source || 'manual',
          isActive:       true,
        });
        summary.mappingsCreated++;
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key — skip silently (idempotent)
          log(`  ⏭️  Skipped duplicate mapping: "${m.categoryName}"`);
        } else {
          const msg = `Failed to create mapping "${m.categoryName}": ${err.message}`;
          summary.errors.push(msg);
          log(`  ❌ ${msg}`);
        }
      }
    }

    log(`  ✅ Created ${summary.mappingsCreated} category mapping(s)`);

    // ── 9. Post-migration validation ───────────────────────────────
    logSection('STEP 9 — Post-migration validation');

    const verifyDepts    = await Department.countDocuments({ isActive: true });
    const verifyHeads    = await Admin.countDocuments({ role: 'department_head', isActive: true });
    const verifyOfficers = await Admin.countDocuments({ role: 'officer', isActive: true });
    const verifyMappings = await CategoryMapping.countDocuments({ isActive: true });
    const verifyComplaints = await mongoose.connection.collection('grievances').countDocuments();

    log(`  ✓ Departments:       ${verifyDepts}`);
    log(`  ✓ Department Heads:  ${verifyHeads}`);
    log(`  ✓ Officers:          ${verifyOfficers}`);
    log(`  ✓ Category Mappings: ${verifyMappings}`);
    log(`  ✓ Complaints (untouched): ${verifyComplaints}`);

    // Validate that AI categories are mapped
    const aiCategories = ['Damaged Road Issue', 'Garbage and Trash Issue', 'Street Light Issue', 'Fallen Trees', 'Illegal Drawing on Walls', 'Other'];
    for (const cat of aiCategories) {
      const mapping = await CategoryMapping.findOne({ categoryName: cat });
      if (mapping) {
        log(`  ✓ AI "${cat}" → ${mapping.departmentCode}`);
      } else {
        log(`  ✗ AI "${cat}" has NO mapping!`);
        summary.errors.push(`Missing AI mapping for "${cat}"`);
      }
    }

    // ── 10. Summary ────────────────────────────────────────────────
    logSection('MIGRATION SUMMARY');

    log(`  Departments created:      ${summary.departmentsCreated}`);
    log(`  Department heads created:  ${summary.headsCreated}`);
    log(`  Officers created:          ${summary.officersCreated}`);
    log(`  Category mappings created: ${summary.mappingsCreated}`);
    log(`  Errors:                    ${summary.errors.length}`);

    if (summary.errors.length > 0) {
      log('\n  ⚠️  ERRORS:');
      summary.errors.forEach((e, i) => log(`    ${i + 1}. ${e}`));
    }

    log('\n  ┌────────────────────────────────────────────────────────┐');
    log('  │  DEFAULT CREDENTIALS                                  │');
    log('  │  Password for ALL heads & officers: Pass@123           │');
    log('  │  Login via Official Portal → /officials/login          │');
    log('  └────────────────────────────────────────────────────────┘');

    log('\n  ✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// ─── Entrypoint ──────────────────────────────────────────────────────
runMigration();
