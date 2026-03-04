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
// seedDefaults removed — departments are now managed via Admin dashboard
// or via scripts/seedProduction.js

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
