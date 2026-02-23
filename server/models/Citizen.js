const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const citizenSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  name: {
    type: String,
    trim: true,
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  
  // OTP Management
  otp: {
    code: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: Date,
  },
  
  // Session Management
  sessions: [{
    token: String,
    deviceInfo: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  
  // Preferences
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'mr'],
    },
    notifications: {
      sms: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
    },
  },
  
  // Push Notification Subscriptions
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Statistics
  stats: {
    totalComplaints: {
      type: Number,
      default: 0,
    },
    resolvedComplaints: {
      type: Number,
      default: 0,
    },
    totalUpvotes: {
      type: Number,
      default: 0,
    },
  },
  
  isVerified: {
    type: Boolean,
    default: false,
  },
  
  isBlocked: {
    type: Boolean,
    default: false,
  },
  
  lastLoginAt: Date,
  
}, {
  timestamps: true,
});

// Generate OTP
citizenSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0,
    lastSentAt: new Date(),
  };
  return otp;
};

// Verify OTP
citizenSchema.methods.verifyOTP = function(inputOTP) {
  if (!this.otp || !this.otp.code) {
    return { valid: false, message: 'No OTP requested' };
  }
  
  if (this.otp.attempts >= 3) {
    return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
  }
  
  if (new Date() > this.otp.expiresAt) {
    return { valid: false, message: 'OTP has expired' };
  }
  
  this.otp.attempts += 1;
  
  if (this.otp.code !== inputOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // OTP is valid, clear it
  this.otp = undefined;
  this.isVerified = true;
  return { valid: true };
};

// Generate session token
citizenSchema.methods.generateSessionToken = function(deviceInfo = '') {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.sessions.push({
    token,
    deviceInfo,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    isActive: true,
  });
  this.lastLoginAt = new Date();
  return token;
};

// Validate session token
citizenSchema.methods.validateSession = function(token) {
  const session = this.sessions.find(s => s.token === token && s.isActive);
  if (session) {
    session.lastUsedAt = new Date();
    return true;
  }
  return false;
};

// Invalidate session
citizenSchema.methods.invalidateSession = function(token) {
  const session = this.sessions.find(s => s.token === token);
  if (session) {
    session.isActive = false;
  }
};

const Citizen = mongoose.model('Citizen', citizenSchema);

module.exports = Citizen;
