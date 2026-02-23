const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { geocodingService, duplicateDetectionService, whatsappService } = require('../services');
const config = require('../config');
const { analyzeComplaint, suggestPriority } = require('../services/aiService');
const { initializeSLA } = require('../services/slaService');
const { notifyNewComplaint, notifyStatusUpdate } = require('../services/socketService');
const { classifyImage: classifyImageService } = require('../services/imageClassificationService'); // ← NEW

/**
 * Classify an image via the Python AI model (proxy endpoint)
 * POST /complaints/classify   (multipart, field: "image")
 * Called directly by the React frontend.
 */
exports.classifyImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded.' });
    }

    const result = await classifyImageService(req.file.path);

    // Clean up the temp file — we only needed it for classification
    fs.unlink(req.file.path, () => {});

    return res.json({
      success:    true,
      category:   result.category,
      raw_label:  result.rawLabel,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('classifyImage error:', error);
    return res.status(500).json({ success: false, message: 'Classification failed.', category: 'other' });
  }
};

/**
 * Create a new complaint
 */
exports.createComplaint = async (req, res) => {
  try {
    const {
      phoneNumber,
      name,
      category,
      description,
      latitude,
      longitude,
      accuracy,
      gpsTimestamp,
      preferredLanguage,
      confirmNotDuplicate,
      sessionId,
    } = req.body;

    // Validate required fields
    if (!category || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, latitude, longitude',
      });
    }

    // Check for duplicates
    if (!confirmNotDuplicate) {
      const duplicateCheck = await duplicateDetectionService.checkForDuplicates(
        parseFloat(longitude),
        parseFloat(latitude),
        category
      );

      if (duplicateCheck.isDuplicate) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: duplicateCheck.message,
          duplicates: duplicateCheck.duplicates,
        });
      }
    }

    // Reverse geocode the location
    const geocodeResult = await geocodingService.reverseGeocode(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    // Generate complaint ID
    const complaintId = await Complaint.generateComplaintId();

    // Process uploaded image
    let imageData = null;
    if (req.file) {
      const originalPath = req.file.path;
      const compressedFileName = `compressed-${req.file.filename}`;
      const compressedPath = path.join(path.dirname(originalPath), compressedFileName);

      // Compress image using sharp
      await sharp(originalPath)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: config.image.compressedQuality })
        .toFile(compressedPath);

      const compressedStats = fs.statSync(compressedPath);

      // Remove original if compression successful
      fs.unlinkSync(originalPath);

      imageData = {
        originalName: req.file.originalname,
        fileName: compressedFileName,
        filePath: compressedPath,
        mimeType: 'image/jpeg',
        size: req.file.size,
        compressedSize: compressedStats.size,
        capturedAt: gpsTimestamp ? new Date(gpsTimestamp) : new Date(),
      };

      // Log image compression
      await AuditLog.log('image_compressed', {
        complaintId,
        details: {
          originalSize: req.file.size,
          compressedSize: compressedStats.size,
          compressionRatio: ((1 - compressedStats.size / req.file.size) * 100).toFixed(2) + '%',
        },
      });
    }

    // Create the complaint
    const complaint = new Complaint({
      complaintId,
      user: {
        phoneNumber,
        name: name || '',
        preferredLanguage: preferredLanguage || 'en',
      },
      category,
      description: description || '',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        accuracy: accuracy ? parseFloat(accuracy) : null,
        timestamp: gpsTimestamp ? new Date(gpsTimestamp) : new Date(),
      },
      address: geocodeResult.success ? geocodeResult.address : {
        fullAddress: `${latitude}, ${longitude}`,
      },
      image: imageData,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        changedAt: new Date(),
        remarks: 'Complaint submitted',
      }],
      duplicateWarningShown: confirmNotDuplicate || false,
      userConfirmedNotDuplicate: confirmNotDuplicate || false,
      whatsappSessionId: sessionId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // AI Analysis
    try {
      const aiAnalysis = await analyzeComplaint(description, category);
      complaint.aiClassification = aiAnalysis;
      complaint.priority = suggestPriority(aiAnalysis);
    } catch (aiError) {
      console.error('AI analysis failed:', aiError);
      // Continue without AI analysis
    }

    // Initialize SLA
    try {
      await initializeSLA(complaint);
    } catch (slaError) {
      console.error('SLA initialization failed:', slaError);
    }

    await complaint.save();

    // Notify admins in real-time
    notifyNewComplaint(complaint);

    // Log complaint creation
    await AuditLog.log('complaint_created', {
      complaint: complaint._id,
      complaintId: complaint.complaintId,
      userPhone: phoneNumber,
      details: {
        category,
        hasImage: !!imageData,
        geocodingSuccess: geocodeResult.success,
      },
    });

    // Send WhatsApp confirmation
    try {
      await whatsappService.sendStatusUpdate(complaint, 'pending');
    } catch (whatsappError) {
      console.error('WhatsApp notification failed:', whatsappError);
      // Don't fail the request if WhatsApp fails
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: {
        complaintId: complaint.complaintId,
        status: complaint.status,
        address: geocodingService.formatAddressForDisplay(complaint.address),
        createdAt: complaint.createdAt,
      },
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit complaint. Please try again.',
      error: config.nodeEnv === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Check for duplicate complaints
 */
exports.checkDuplicates = async (req, res) => {
  try {
    const { latitude, longitude, category } = req.body;

    if (!latitude || !longitude || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: latitude, longitude, category',
      });
    }

    const result = await duplicateDetectionService.checkForDuplicates(
      parseFloat(longitude),
      parseFloat(latitude),
      category
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Check duplicates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check for duplicates',
    });
  }
};

/**
 * Reverse geocode coordinates
 */
exports.reverseGeocode = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: latitude, longitude',
      });
    }

    const result = await geocodingService.reverseGeocode(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.json({
      success: true,
      address: result.address,
      formattedAddress: geocodingService.formatAddressForDisplay(result.address),
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address',
    });
  }
};

/**
 * Get complaint status by ID (public endpoint)
 */
exports.getComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { phone } = req.query;

    const complaint = await Complaint.findOne({ complaintId });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Verify phone number for privacy
    if (phone && complaint.user.phoneNumber !== phone) {
      return res.status(403).json({
        success: false,
        message: 'Phone number does not match',
      });
    }

    res.json({
      success: true,
      data: {
        complaint: {
          complaintId: complaint.complaintId,
          status: complaint.status,
          category: complaint.category,
          description: complaint.description,
          location: {
            address: geocodingService.formatAddressForDisplay(complaint.address),
            coordinates: complaint.location?.coordinates,
          },
          address: geocodingService.formatAddressForDisplay(complaint.address),
          createdAt: complaint.createdAt,
          updatedAt: complaint.updatedAt,
          statusHistory: complaint.statusHistory.map(h => ({
            status: h.status,
            changedAt: h.changedAt,
            remarks: h.remarks,
          })),
          resolution: complaint.status === 'resolved' ? complaint.resolution : null,
          image: complaint.image ? {
            fileName: complaint.image.fileName,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Get complaint status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get complaint status',
    });
  }
};

/**
 * Get all complaints (admin)
 */
exports.getAllComplaints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { complaintId: { $regex: search, $options: 'i' } },
        { 'user.phoneNumber': { $regex: search, $options: 'i' } },
        { 'address.fullAddress': { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedTo', 'name email')
        .lean(),
      Complaint.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        complaints: complaints.map(c => ({
          ...c,
          formattedAddress: geocodingService.formatAddressForDisplay(c.address),
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints',
    });
  }
};

/**
 * Get single complaint (admin)
 */
exports.getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('statusHistory.changedBy', 'name email')
      .populate('duplicateOf', 'complaintId status');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    res.json({
      success: true,
      data: {
        complaint: {
          ...complaint.toObject(),
          formattedAddress: geocodingService.formatAddressForDisplay(complaint.address),
        },
      },
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint',
    });
  }
};

/**
 * Update complaint status (admin)
 */
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected', 'duplicate'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    const previousStatus = complaint.status;
    complaint.updateStatus(status, req.admin._id, remarks);

    if (status === 'resolved') {
      complaint.resolution = {
        description: remarks,
        resolvedAt: new Date(),
      };
    }

    await complaint.save();

    // Log status change
    await AuditLog.log('status_changed', {
      complaint: complaint._id,
      complaintId: complaint.complaintId,
      admin: req.admin._id,
      previousValue: previousStatus,
      newValue: status,
      details: { remarks },
    });

    // Send WhatsApp notification
    try {
      const result = await whatsappService.sendStatusUpdate(complaint, status);
      
      // Update the status history with WhatsApp notification result
      const lastHistory = complaint.statusHistory[complaint.statusHistory.length - 1];
      lastHistory.whatsappNotificationSent = result.success;
      lastHistory.whatsappMessageId = result.messageId;
      await complaint.save();
    } catch (whatsappError) {
      console.error('WhatsApp notification failed:', whatsappError);
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        complaintId: complaint.complaintId,
        status: complaint.status,
        previousStatus,
      },
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
    });
  }
};

/**
 * Assign complaint to admin
 */
exports.assignComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { assignedTo: adminId },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    await AuditLog.log('complaint_assigned', {
      complaint: complaint._id,
      complaintId: complaint.complaintId,
      admin: req.admin._id,
      details: { assignedTo: adminId },
    });

    res.json({
      success: true,
      message: 'Complaint assigned successfully',
      data: complaint,
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign complaint',
    });
  }
};

/**
 * Get complaints for map view (admin)
 */
exports.getComplaintsForMap = async (req, res) => {
  try {
    const { status, category, startDate, endDate, bounds } = req.query;

    const query = {};

    if (status) {
      query.status = { $in: status.split(',') };
    }

    if (category) {
      query.category = { $in: category.split(',') };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filter by map bounds if provided
    if (bounds) {
      const [swLng, swLat, neLng, neLat] = bounds.split(',').map(Number);
      query.location = {
        $geoWithin: {
          $box: [
            [swLng, swLat],
            [neLng, neLat],
          ],
        },
      };
    }

    const complaints = await Complaint.find(query)
      .select('complaintId category status location address createdAt image')
      .limit(1000)
      .lean();

    // Format for map display
    const mapData = complaints.map(c => ({
      id: c._id,
      complaintId: c.complaintId,
      category: c.category,
      status: c.status,
      coordinates: {
        lat: c.location.coordinates[1],
        lng: c.location.coordinates[0],
      },
      address: geocodingService.formatAddressForDisplay(c.address),
      createdAt: c.createdAt,
      hasImage: !!c.image?.filePath,
    }));

    res.json({
      success: true,
      data: mapData,
    });
  } catch (error) {
    console.error('Get map complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch map data',
    });
  }
};

/**
 * Get complaint statistics (admin)
 */
exports.getComplaintStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateMatch = {};
    if (startDate || endDate) {
      dateMatch.createdAt = {};
      if (startDate) dateMatch.createdAt.$gte = new Date(startDate);
      if (endDate) dateMatch.createdAt.$lte = new Date(endDate);
    }

    const [
      statusStats,
      categoryStats,
      dailyStats,
      totalCount,
    ] = await Promise.all([
      // Stats by status
      Complaint.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      
      // Stats by category
      Complaint.aggregate([
        { $match: dateMatch },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      
      // Daily stats for last 30 days
      Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      
      // Total count
      Complaint.countDocuments(dateMatch),
    ]);

    res.json({
      success: true,
      data: {
        total: totalCount,
        byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byCategory: categoryStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        daily: dailyStats,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
    });
  }
};

/**
 * Serve complaint image
 */
exports.getComplaintImage = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint || !complaint.image?.filePath) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    const imagePath = complaint.image.filePath;
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image file not found',
      });
    }

    res.sendFile(path.resolve(imagePath));
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch image',
    });
  }
};

/**
 * Update complaint (admin) - general update endpoint
 */
exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, internalNotes, remarks } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    const previousStatus = complaint.status;
    let statusChanged = false;

    // Update status if provided
    if (status && status !== complaint.status) {
      const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected', 'duplicate'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
      }
      complaint.updateStatus(status, req.admin._id, remarks || internalNotes);
      statusChanged = true;

      if (status === 'resolved') {
        complaint.resolution = {
          description: remarks || internalNotes,
          resolvedAt: new Date(),
        };
      }
    }

    // Update priority if provided
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (validPriorities.includes(priority)) {
        complaint.priority = priority;
      }
    }

    // Update internal notes if provided
    if (internalNotes) {
      complaint.internalNotes = complaint.internalNotes || [];
      complaint.internalNotes.push({
        note: internalNotes,
        addedBy: req.admin._id,
        addedAt: new Date(),
      });
    }

    await complaint.save();

    // Log the update
    await AuditLog.log('complaint_updated', {
      complaint: complaint._id,
      complaintId: complaint.complaintId,
      admin: req.admin._id,
      details: { status, priority, internalNotes, previousStatus },
    });

    // Send WhatsApp notification if status changed
    if (statusChanged) {
      try {
        const result = await whatsappService.sendStatusUpdate(complaint, status);
        const lastHistory = complaint.statusHistory[complaint.statusHistory.length - 1];
        if (lastHistory) {
          lastHistory.whatsappNotificationSent = result.success;
          lastHistory.whatsappMessageId = result.messageId;
          await complaint.save();
        }
      } catch (whatsappError) {
        console.error('WhatsApp notification failed:', whatsappError);
      }
    }

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      data: {
        complaintId: complaint.complaintId,
        status: complaint.status,
        priority: complaint.priority,
        previousStatus,
      },
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update complaint',
    });
  }
};