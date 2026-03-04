const mongoose = require('mongoose');

/**
 * CategoryMapping — AI-Safe routing layer
 *
 * Maps complaint categories (predicted by AI or manually selected)
 * to the correct department.  This decouples the AI model output
 * from the department hierarchy so either can change independently.
 *
 * Flow:  AI Prediction → CategoryMapping → Department
 */
const categoryMappingSchema = new mongoose.Schema({
  // The category or sub-category name (must match AI output or manual selection)
  categoryName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },

  // Reference to the target Department document
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },

  // Snapshot: department display name at time of mapping
  departmentName: {
    type: String,
    trim: true,
  },

  // Matches Department.code — used by complaint routing
  departmentCode: {
    type: String,
    trim: true,
    lowercase: true,
  },

  // Expected resolution duration (from Excel / admin input)
  slaDuration: {
    type: String,
    trim: true,
  },

  // Whether this is an AI-predicted category or a manual sub-category
  source: {
    type: String,
    enum: ['ai', 'manual', 'legacy'],
    default: 'manual',
  },

  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const CategoryMapping = mongoose.model('CategoryMapping', categoryMappingSchema);

module.exports = CategoryMapping;
