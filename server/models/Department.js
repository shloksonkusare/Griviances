const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  description: {
    type: String,
    trim: true,
    default: '',
  },

  // Department Head snapshot (populated by migration script)
  headName: {
    type: String,
    trim: true,
  },

  headEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },

  headPhone: {
    type: String,
    trim: true,
  },

  // Complaint subcategories this department handles, each with its own SLA
  supportedCategories: [{
    name: { type: String, trim: true, required: true },
    sla:  { type: String, trim: true, default: '3-5 Days' },
  }],

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

/**
 * Seed default departments if none exist.
 * Call once during server startup.
 */
departmentSchema.statics.seedDefaults = async function () {
  const count = await this.countDocuments();
  if (count > 0) return;

  const defaults = [
    { name: 'Roads & Infrastructure', code: 'road_department', description: 'Handles road damage, potholes, and infrastructure issues' },
    { name: 'Sanitation',             code: 'sanitation_department', description: 'Handles garbage, trash, and cleanliness issues' },
    { name: 'Electricity',            code: 'electricity_department', description: 'Handles street lights and electrical issues' },
    { name: 'Garden & Environment',   code: 'garden_department', description: 'Handles fallen trees, parks, and greenery' },
    { name: 'Enforcement',            code: 'enforcement_department', description: 'Handles illegal drawings, encroachments, and violations' },
  ];

  await this.insertMany(defaults);
  console.log('✅ Default departments seeded');
};

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
