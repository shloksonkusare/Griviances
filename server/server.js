require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const config = require('./config');
const { complaintRoutes, adminRoutes, whatsappRoutes } = require('./routes');
const citizenRoutes = require('./routes/citizenRoutes');
const communityRoutes = require('./routes/communityRoutes');
const { initializeSocket } = require('./services/socketService');
const { initializeSLACron } = require('./services/slaService');
const { verifyConnection: verifyEmailConnection } = require('./services/emailService');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable for development
}));

// CORS configuration
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? config.clientUrl 
    : ['http://localhost:5173', 'http://localhost:3000', config.clientUrl],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for serving images)
app.use('/uploads', express.static(path.join(__dirname, config.uploadDir)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/community', communityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry found',
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: config.nodeEnv === 'production' 
      ? 'Something went wrong' 
      : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create indexes (drop conflicting indexes first)
    const { Complaint, Admin, AuditLog } = require('./models');
    
    try {
      // Drop the old phoneNumber index if it exists with different options
      await mongoose.connection.collection('complaints').dropIndex('user.phoneNumber_1');
    } catch (e) {
      // Index might not exist, ignore error
    }
    
    await Complaint.createIndexes();
    await Admin.createIndexes();
    await AuditLog.createIndexes();
    console.log('✅ Database indexes created');

    // Initialize Socket.IO
    initializeSocket(server);
    console.log('✅ WebSocket server initialized');

    // Initialize SLA monitoring
    initializeSLACron();
    
    // Verify email connection
    await verifyEmailConnection();

    // Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Client URL: ${config.clientUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

module.exports = app;
