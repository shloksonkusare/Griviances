/**
 * imageClassificationService.js (ENHANCED with Validation Layer)
 * GrievancePortal/server/services/imageClassificationService.js
 *
 * Sends the complaint image to the Python FastAPI /classify endpoint.
 * Now handles AI validation layer responses (accepts/rejects images).
 *
 * NEW FEATURES:
 * - Validates images before classification
 * - Returns validation metadata
 * - Handles validation errors (HTTP 400)
 * - Falls back gracefully on errors
 *
 * Add this to GrievancePortal/server/.env:
 *   AI_CLASSIFIER_URL=http://localhost:8000
 */

'use strict';

const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const CLASSIFIER_URL = process.env.AI_CLASSIFIER_URL || 'http://localhost:8000';
const TIMEOUT_MS     = 30000; // 30 seconds (increased for validation + classification)

const VALID_CATEGORIES = new Set([
  'Damaged Road Issue',
  'Fallen Trees',
  'Garbage and Trash Issue',
  'Illegal Drawing on Walls',
  'Street Light Issue',
  'Other',
]);

// Default fallback category when classification fails
const DEFAULT_CATEGORY = 'Other';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a multipart/form-data body buffer from a file on disk.
 * Returns { buffer, boundary }.
 */
function buildMultipartBody(fieldName, filePath) {
  const boundary  = '----FormBoundary' + crypto.randomBytes(12).toString('hex');
  const filename  = path.basename(filePath);
  const fileData  = fs.readFileSync(filePath);

  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);

  return {
    buffer:   Buffer.concat([head, fileData, tail]),
    boundary,
  };
}

/**
 * Fire an HTTP/HTTPS POST request and resolve with parsed JSON body.
 * Handles both success (200-299) and error (400) responses.
 */
function postRequest(urlString, body, headers) {
  return new Promise((resolve, reject) => {
    const url      = new URL(urlString);
    const driver   = url.protocol === 'https:' ? https : http;
    const options  = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method:   'POST',
      headers,
      timeout:  TIMEOUT_MS,
    };

    const req = driver.request(options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return reject(new Error(`Non-JSON response: ${raw.slice(0, 200)}`));
        }

        // Success responses (200-299)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return resolve({ success: true, statusCode: res.statusCode, data: parsed });
        }
        
        // Validation error (400) - image rejected
        if (res.statusCode === 400) {
          return resolve({ 
            success: false, 
            statusCode: 400, 
            validationError: true,
            data: parsed 
          });
        }
        
        // Other errors
        reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${TIMEOUT_MS / 1000}s`));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * classifyImage (ENHANCED)
 * ------------------------------------------------------------------
 * @param  {string} imagePath  Absolute path to the image on disk
 * @returns {Promise<Object>}  Classification result with validation metadata
 * 
 * Returns:
 * {
 *   success: boolean,           // Overall success
 *   category: string,           // Predicted category
 *   rawLabel: string,           // Raw label from AI
 *   confidence: string,         // 'high' | 'medium' | 'low' | 'none'
 *   confidenceScore: number,    // 0.0 - 1.0
 *   validation: {               // NEW: Validation metadata
 *     isValid: boolean,
 *     score: number,
 *     reason: string
 *   },
 *   validationError: boolean,   // NEW: True if image was rejected
 *   message: string             // NEW: Error message if rejected
 * }
 * 
 * Behavior:
 * - If image is valid → Returns classification
 * - If image is invalid → Returns validation error
 * - If AI service fails → Falls back to 'Other' category
 */
async function classifyImage(imagePath) {
  // Guard: file must exist
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.warn('[imageClassification] File not found:', imagePath);
    return { 
      success: false,
      category: DEFAULT_CATEGORY, 
      rawLabel: 'unknown', 
      confidence: 'none',
      confidenceScore: 0,
      validationError: false,
      message: 'Image file not found'
    };
  }

  try {
    const { buffer, boundary } = buildMultipartBody('image', imagePath);

    const response = await postRequest(
      `${CLASSIFIER_URL}/classify`,
      buffer,
      {
        'Content-Type':   `multipart/form-data; boundary=${boundary}`,
        'Content-Length': buffer.length,
      }
    );

    // ═══════════════════════════════════════════════════════════════════════
    // CASE 1: Validation Error (Image Rejected)
    // ═══════════════════════════════════════════════════════════════════════
    
    if (response.validationError) {
      const detail = response.data.detail || {};
      const validation = detail.validation || {};
      
      console.warn(
        `[imageClassification] ✗ VALIDATION FAILED: ${validation.reason || 'Unknown reason'}`
      );

      return {
        success: false,
        validationError: true,
        message: detail.message || 'The uploaded image does not appear to represent a valid municipal issue.',
        validation: {
          isValid: false,
          score: validation.score || 0,
          reason: validation.reason || 'Image validation failed'
        },
        category: null,
        rawLabel: null,
        confidence: null,
        confidenceScore: 0
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CASE 2: Success (Image Valid & Classified)
    // ═══════════════════════════════════════════════════════════════════════
    
    const data = response.data;
    const rawLabel       = data.raw_label || 'unknown';
    const confidence     = data.confidence || 'high';
    const confidenceScore = data.confidence_score || 0;
    const rawCategory    = (data.category || '').trim();
    const safeCategory   = VALID_CATEGORIES.has(rawCategory) ? rawCategory : DEFAULT_CATEGORY;
    const validation     = data.validation || { isValid: true, score: 1.0, reason: 'Validation passed' };

    console.log(
      `[imageClassification] ✓ VALIDATED & CLASSIFIED: ` +
      `category="${safeCategory}" confidence="${confidence}" (${confidenceScore.toFixed(2)}) ` +
      `validation_score=${validation.score?.toFixed(2) || 'N/A'}`
    );

    return {
      success: true,
      validationError: false,
      category: safeCategory,
      rawLabel,
      confidence,
      confidenceScore,
      validation: {
        isValid: validation.is_valid !== false,
        score: validation.score || 0,
        reason: validation.reason || 'Image validated successfully'
      }
    };

  } catch (err) {
    // ═══════════════════════════════════════════════════════════════════════
    // CASE 3: Network/System Error (Fail-Open)
    // ═══════════════════════════════════════════════════════════════════════
    
    console.error('[imageClassification] ✗ Service error:', err.message);
    
    return {
      success: false,
      validationError: false,
      category: DEFAULT_CATEGORY,
      rawLabel: 'error',
      confidence: 'none',
      confidenceScore: 0,
      message: 'Classification service unavailable',
      validation: {
        isValid: true,  // Fail-open: allow submission on service error
        score: 0.5,
        reason: 'Classification service error - validation skipped'
      }
    };
  }
}

/**
 * validateImageOnly (NEW)
 * ------------------------------------------------------------------
 * Validates image without classification (for testing/preview).
 * 
 * @param  {string} imagePath  Absolute path to the image on disk
 * @returns {Promise<Object>}  Validation result only
 */
async function validateImageOnly(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return { 
      isValid: false, 
      score: 0, 
      reason: 'Image file not found' 
    };
  }

  try {
    const { buffer, boundary } = buildMultipartBody('image', imagePath);

    const response = await postRequest(
      `${CLASSIFIER_URL}/validate-only`,
      buffer,
      {
        'Content-Type':   `multipart/form-data; boundary=${boundary}`,
        'Content-Length': buffer.length,
      }
    );

    if (response.success) {
      const data = response.data;
      return {
        isValid: data.is_valid !== false,
        score: data.score || 0,
        reason: data.reason || 'Unknown'
      };
    }

    return { isValid: false, score: 0, reason: 'Validation failed' };

  } catch (err) {
    console.error('[imageClassification] Validation-only error:', err.message);
    return { 
      isValid: true,  // Fail-open
      score: 0.5, 
      reason: 'Validation service error' 
    };
  }
}

module.exports = { 
  classifyImage,
  validateImageOnly  // NEW: Export validation-only function
};