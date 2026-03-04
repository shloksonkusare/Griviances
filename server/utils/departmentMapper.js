/**
 * Department Mapper Utility
 * Maps complaint categories → department codes for auto-routing.
 *
 * Two modes:
 *  1. getDepartmentByCategory(category)        — sync, hardcoded fallback
 *  2. getDepartmentByCategoryAsync(category)    — async, checks CategoryMapping
 *     collection first then falls back to (1).
 */

const CATEGORY_DEPARTMENT_MAP = {
  // Current AI-predicted categories
  'Damaged Road Issue':       'road_department',
  'Garbage and Trash Issue':  'sanitation_department',
  'Street Light Issue':       'electricity_department',
  'Fallen Trees':             'sanitation_department',
  'Illegal Drawing on Walls': 'road_department',
  'Other':                    'road_department', // default fallback

  // Legacy category mappings
  'DamagedRoads':             'road_department',
  'ElectricityIssues':        'electricity_department',
  'GarbageAndSanitation':     'sanitation_department',
  'road_damage':              'road_department',
  'street_light':             'electricity_department',
  'water_supply':             'sanitation_department',
  'sewage':                   'sanitation_department',
  'garbage':                  'sanitation_department',
  'encroachment':             'road_department',
  'noise_pollution':          'road_department',
  'illegal_construction':     'road_department',
  'traffic':                  'road_department',
  'other':                    'road_department',
};

const DEFAULT_DEPARTMENT = 'road_department';

/**
 * Synchronous fallback — uses hardcoded map only.
 * @param {string} category
 * @returns {string} department code
 */
function getDepartmentByCategory(category) {
  return CATEGORY_DEPARTMENT_MAP[category] || DEFAULT_DEPARTMENT;
}

/**
 * Async version — checks CategoryMapping collection first,
 * falls back to the hardcoded map if no DB entry is found.
 *
 * Returns { departmentCode, departmentId, departmentName }
 */
async function getDepartmentByCategoryAsync(category) {
  try {
    const CategoryMapping = require('../models/CategoryMapping');
    const mapping = await CategoryMapping.findOne({
      categoryName: category,
      isActive: true,
    }).lean();

    if (mapping) {
      return {
        departmentCode: mapping.departmentCode,
        departmentId:   mapping.departmentId || null,
        departmentName: mapping.departmentName || null,
      };
    }
  } catch (_err) {
    // CategoryMapping collection may not exist yet — fall through
  }

  // Fallback to hardcoded map
  const code = CATEGORY_DEPARTMENT_MAP[category] || DEFAULT_DEPARTMENT;
  return { departmentCode: code, departmentId: null, departmentName: null };
}

module.exports = {
  getDepartmentByCategory,
  getDepartmentByCategoryAsync,
  CATEGORY_DEPARTMENT_MAP,
  DEFAULT_DEPARTMENT,
};
