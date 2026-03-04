const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { adminController } = require('../controllers');
const { auth, authorize, validate } = require('../middleware');

// Initialize first super admin (works only once)
router.post(
  '/initialize',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  validate,
  adminController.initializeSuperAdmin
);

// Seed all default accounts (admin + dept heads + officers)
// Protected: only super_admin can re-seed; if no admins exist yet it's allowed
router.post('/seed', async (req, res, next) => {
  const Admin = require('../models/Admin');
  const count = await Admin.countDocuments();
  if (count > 0) {
    // Admins exist — require super_admin auth
    return auth(req, res, (err) => {
      if (err) return next(err);
      if (req.admin?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      next();
    });
  }
  next(); // No admins yet — allow initial seed without auth
}, adminController.seedAccounts);

// Admin login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  adminController.login
);

// Protected routes
router.use(auth);

// Get current admin profile
router.get('/profile', adminController.getProfile);

// Update current admin profile
router.patch(
  '/profile',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid phone'),
    body('preferredLanguage')
      .optional()
      .isIn(['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa']),
  ],
  validate,
  adminController.updateProfile
);

// Change password
router.post(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validate,
  adminController.changePassword
);

// Logout
router.post('/logout', adminController.logout);

// Super admin only routes
router.get(
  '/all',
  authorize('super_admin'),
  adminController.getAllAdmins
);

router.post(
  '/',
  authorize('super_admin'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role')
      .optional()
      .isIn(['super_admin', 'admin', 'moderator', 'viewer', 'department_head', 'officer'])
      .withMessage('Invalid role'),
    body('department')
      .optional()
      .isIn(['roads', 'electricity', 'water', 'sanitation', 'general', 'all',
        'road_department', 'sanitation_department', 'electricity_department',
        'garden_department', 'enforcement_department'])
      .withMessage('Invalid department'),
  ],
  validate,
  adminController.createAdmin
);

router.patch(
  '/:id',
  authorize('super_admin'),
  [
    param('id').isMongoId().withMessage('Invalid admin ID'),
  ],
  validate,
  adminController.updateAdmin
);

router.delete(
  '/:id',
  authorize('super_admin'),
  [
    param('id').isMongoId().withMessage('Invalid admin ID'),
  ],
  validate,
  adminController.deleteAdmin
);

// ─── One-time: Seed departments + officials for production ──────
// POST /api/admin/seed-departments  (super_admin only)
router.post('/seed-departments', authorize('super_admin'), async (req, res) => {
  try {
    const Department = require('../models/Department');
    const Admin = require('../models/Admin');

    const DEFAULT_PASSWORD = 'Pass@123';

    const HEAD_PERMISSIONS = {
      canViewComplaints: true, canUpdateStatus: true, canAssignComplaints: true,
      canDeleteComplaints: false, canManageAdmins: false, canViewAnalytics: true, canExportData: true,
    };
    const OFFICER_PERMISSIONS = {
      canViewComplaints: true, canUpdateStatus: true, canAssignComplaints: false,
      canDeleteComplaints: false, canManageAdmins: false, canViewAnalytics: false, canExportData: false,
    };

    const DEPARTMENTS = [
      {
        name: 'Road Department (PWD)', code: 'road_department',
        description: 'Public Works Department — handles road damage, potholes, signage, dividers, manholes, and infrastructure issues',
        priority: 'medium',
        subcategories: [
          { name: 'Pothole', sla: '2-3 Days' }, { name: 'Surface Damage', sla: '7-15 Days' },
          { name: 'Speed Breaker Repair', sla: '3-7 Days' }, { name: 'Missing Road Signboard', sla: '3-5 Days' },
          { name: 'Divider Damage', sla: '7-15 Days' }, { name: 'Manhole Cover Damage', sla: '1-3 Days' },
          { name: 'Road Marking / Zebra Crossing', sla: '7-15 Days' },
        ],
        head: { name: 'Er. Rajesh Deshmukh', email: 'rajesh.d@gmail.com', phone: '9876500001', designation: 'Road Department / PWD Head' },
        officers: [
          { name: 'Er. Amit Kulkarni', email: 'amitk@gmail.com', phone: '9876500002', designation: 'Executive Engineer' },
          { name: 'Er. Pravin Patil', email: 'pravinp@gmail.com', phone: '9876500003', designation: 'Executive Engineer' },
          { name: 'Er. Sneha Joshi', email: 'snehaj@gmail.com', phone: '9876500004', designation: 'Assistant Engineer' },
          { name: 'Er. Nikhil Shinde', email: 'nikhils@gmail.com', phone: '9876500005', designation: 'Assistant Engineer' },
          { name: 'Er. Rohan Wankhede', email: 'rohanw@gmail.com', phone: '9876500006', designation: 'Junior Engineer' },
          { name: 'Er. Pooja Kale', email: 'poojak@gmail.com', phone: '9876500007', designation: 'Junior Engineer' },
          { name: 'Mahesh Pawar', email: 'maheshp@gmail.com', phone: '9876500008', designation: 'Section Officer' },
          { name: 'Ganesh More', email: 'ganeshm@gmail.com', phone: '9876500009', designation: 'Section Officer' },
          { name: 'Suresh Thakre', email: 'suresht@gmail.com', phone: '9876500010', designation: 'Senior Clerk' },
          { name: 'Kavita Bhosale', email: 'kavitab@gmail.com', phone: '9876500011', designation: 'Clerk' },
          { name: 'Rahul Gawande', email: 'rahulg@gmail.com', phone: '9876500012', designation: 'Clerk' },
          { name: 'Neha Ingle', email: 'nehai@gmail.com', phone: '9876500013', designation: 'Clerk' },
        ],
      },
      {
        name: 'Sanitation Department', code: 'sanitation_department',
        description: 'Solid Waste Management & Sanitation — handles garbage, drainage, public toilets, waterlogging, pest control',
        priority: 'medium',
        subcategories: [
          { name: 'Garbage Not Collected', sla: '1-2 Days' }, { name: 'Drainage Blockage', sla: '2-4 Days' },
          { name: 'Dead Animal Removal', sla: 'Same Day' }, { name: 'Public Toilet Cleaning', sla: '1 Day' },
          { name: 'Water Logging (Minor)', sla: '2-5 Days' }, { name: 'Open Drain Cleaning', sla: '2-5 Days' },
          { name: 'Mosquito Breeding Issue', sla: '2-3 Days' }, { name: 'Broken Dustbin Replacement', sla: '3-7 Days' },
        ],
        head: { name: 'Dr. Sunil Patwardhan', email: 'sunilp@gmail.com', phone: '9876500101', designation: 'Health Officer / Sanitation Head' },
        officers: [
          { name: 'Dr. Meena Tiwari', email: 'meenat@gmail.com', phone: '9876500102', designation: 'Executive Health Officer' },
          { name: 'Dr. Ajay Ingole', email: 'ajayi@gmail.com', phone: '9876500103', designation: 'Assistant Health Officer' },
          { name: 'Rakesh Jadhav', email: 'rakeshj@gmail.com', phone: '9876500104', designation: 'Sanitary Inspector' },
          { name: 'Lata Bhure', email: 'latab@gmail.com', phone: '9876500105', designation: 'Sanitary Inspector' },
          { name: 'Shailesh Pande', email: 'shaileshp@gmail.com', phone: '9876500106', designation: 'Ward Supervisor' },
          { name: 'Pritam Dange', email: 'pritamd@gmail.com', phone: '9876500107', designation: 'Ward Supervisor' },
          { name: 'Sagar Kadu', email: 'sagark@gmail.com', phone: '9876500108', designation: 'Field Officer' },
          { name: 'Komal Mahalle', email: 'komalm@gmail.com', phone: '9876500109', designation: 'Field Officer' },
          { name: 'Vijay Waghmare', email: 'vijayw@gmail.com', phone: '9876500110', designation: 'Senior Clerk' },
          { name: 'Aarti Rathod', email: 'aartir@gmail.com', phone: '9876500111', designation: 'Clerk' },
          { name: 'Deepak Meshram', email: 'deepakm@gmail.com', phone: '9876500112', designation: 'Clerk' },
          { name: 'Swati Rode', email: 'swatir@gmail.com', phone: '9876500113', designation: 'Clerk' },
        ],
      },
      {
        name: 'Electricity Department', code: 'electricity_department',
        description: 'Street Light & Electrical Department — handles street lights, wiring, poles, transformers, cables',
        priority: 'medium',
        subcategories: [
          { name: 'Street Light Not Working', sla: '2-3 Days' }, { name: 'Open/Loose Electric Wire', sla: 'Same Day' },
          { name: 'Electric Pole Damage', sla: '3-7 Days' }, { name: 'Transformer Issue', sla: '1-3 Days' },
          { name: 'Cable Fault', sla: '1-3 Days' },
        ],
        head: { name: 'Er. Vivek Bhandari', email: 'vivekb@gmail.com', phone: '9876500201', designation: 'Electrical Engineer / Dept Head' },
        officers: [
          { name: 'Er. Manoj Kapse', email: 'manojk@gmail.com', phone: '9876500202', designation: 'Executive Engineer' },
          { name: 'Er. Priyanka Dhore', email: 'priyankad@gmail.com', phone: '9876500203', designation: 'Assistant Engineer' },
          { name: 'Er. Hemant Barve', email: 'hemantb@gmail.com', phone: '9876500204', designation: 'Assistant Engineer' },
          { name: 'Er. Akash Bhagat', email: 'akashb@gmail.com', phone: '9876500205', designation: 'Junior Engineer' },
          { name: 'Er. Shweta Raut', email: 'shwetar@gmail.com', phone: '9876500206', designation: 'Junior Engineer' },
          { name: 'Sanjay Kothari', email: 'sanjayk@gmail.com', phone: '9876500207', designation: 'Electrical Inspector' },
          { name: 'Nitin Dhok', email: 'nitind@gmail.com', phone: '9876500208', designation: 'Line Supervisor' },
          { name: 'Amol Rane', email: 'amolr@gmail.com', phone: '9876500209', designation: 'Line Supervisor' },
          { name: 'Prakash Bhalerao', email: 'prakashb@gmail.com', phone: '9876500210', designation: 'Senior Clerk' },
          { name: 'Seema Yadav', email: 'seemay@gmail.com', phone: '9876500211', designation: 'Clerk' },
          { name: 'Rohit Khandekar', email: 'rohitk@gmail.com', phone: '9876500212', designation: 'Clerk' },
          { name: 'Anita Korde', email: 'anitak@gmail.com', phone: '9876500213', designation: 'Clerk' },
          { name: 'Sandeep More', email: 'sandeepm@gmail.com', phone: '9876500214', designation: 'Technician' },
          { name: 'Yogesh Patil', email: 'yogeshp@gmail.com', phone: '9876500215', designation: 'Technician' },
        ],
      },
      {
        name: 'Garden / Tree Department', code: 'garden_tree_department',
        description: 'Handles fallen trees, parks, and greenery related issues',
        priority: 'medium',
        subcategories: [{ name: 'Fallen Trees', sla: '1-2 Days' }],
        head: { name: 'Yuvraj Bhatkar', email: 'yuvi@gmail.com', phone: '7767055408', designation: 'Senior Officer' },
        officers: [
          { name: 'Rushikesh barwat', email: 'rushi@gmail.com', phone: '1478523698', designation: 'Field Officer' },
          { name: 'Shrikan Sonikar', email: 'shri@gmail.com', phone: '1452147856', designation: 'Officer', employeeId: 'EMA-100' },
        ],
      },
      {
        name: 'Drainage & Water Department', code: 'drainage_water_department',
        description: 'Handles drainage blockage, open drains, water logging, and manhole issues',
        priority: 'high',
        subcategories: [
          { name: 'Drainage Blockage', sla: '1 Day' }, { name: 'Open Drain', sla: 'Same Day' },
          { name: 'Water Logging', sla: '1-2 Days' }, { name: 'Manhole Cover Damage', sla: '2-5 Days' },
        ],
        head: null,
        officers: [],
      },
    ];

    // Step 1: Delete all old departments
    await Department.deleteMany({});

    // Step 2: Delete all old department_head & officer accounts
    await Admin.deleteMany({ role: { $in: ['department_head', 'officer'] } });

    // Step 3: Create departments + heads + officers
    let headsCreated = 0, officersCreated = 0;
    for (const dept of DEPARTMENTS) {
      const deptDoc = await Department.create({
        name: dept.name, code: dept.code, description: dept.description,
        headName: dept.head?.name || '', headEmail: dept.head?.email || '', headPhone: dept.head?.phone || '',
        supportedCategories: dept.subcategories, priority: dept.priority, isActive: true,
      });

      if (dept.head) {
        await Admin.create({
          name: dept.head.name, email: dept.head.email, password: DEFAULT_PASSWORD,
          phone: dept.head.phone, role: 'department_head', department: dept.code,
          departmentCode: dept.code, departmentRef: deptDoc._id,
          designation: dept.head.designation, isActive: true, permissions: HEAD_PERMISSIONS,
        });
        headsCreated++;
      }

      for (const off of dept.officers) {
        await Admin.create({
          name: off.name, email: off.email, password: DEFAULT_PASSWORD,
          phone: off.phone, role: 'officer', department: dept.code,
          departmentCode: dept.code, departmentRef: deptDoc._id,
          designation: off.designation, employeeId: off.employeeId || '',
          isActive: true, permissions: OFFICER_PERMISSIONS,
        });
        officersCreated++;
      }
    }

    res.json({
      success: true,
      message: `Seeded ${DEPARTMENTS.length} departments, ${headsCreated} heads, ${officersCreated} officers`,
    });
  } catch (error) {
    console.error('Seed departments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
