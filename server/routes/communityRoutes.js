const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { validate } = require('../middleware');
const { optionalCitizenAuth } = require('../middleware/citizenAuth');
const { notifyUpvote } = require('../services/socketService');
const crypto = require('crypto');

/**
 * Get public complaint feed
 */
router.get(
  '/feed',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('category').optional(),
    query('status').optional().isIn(['pending', 'in_progress', 'resolved']),
    query('sortBy').optional().isIn(['newest', 'oldest', 'most_upvoted']),
  ],
  validate,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        category, 
        status,
        sortBy = 'newest' 
      } = req.query;

      // Build query
      const query = { isPublic: { $ne: false } };
      if (category) query.category = category;
      if (status) query.status = status;

      // Build sort
      let sort = {};
      switch (sortBy) {
        case 'oldest':
          sort = { createdAt: 1 };
          break;
        case 'most_upvoted':
          sort = { upvoteCount: -1, createdAt: -1 };
          break;
        default:
          sort = { createdAt: -1 };
      }

      const complaints = await Complaint.find(query)
        .select('complaintId category status description address.fullAddress location upvoteCount createdAt')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Complaint.countDocuments(query);

      res.json({
        success: true,
        data: {
          complaints,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get feed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get feed',
      });
    }
  }
);

/**
 * Get single public complaint
 */
router.get(
  '/:complaintId',
  [param('complaintId').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const complaint = await Complaint.findOne({
        complaintId: req.params.complaintId,
        isPublic: { $ne: false },
      }).select('-image.filePath -images.filePath -voiceNote.filePath -user.phoneNumber -ipAddress -userAgent');

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found',
        });
      }

      res.json({
        success: true,
        data: { complaint },
      });
    } catch (error) {
      console.error('Get complaint error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get complaint',
      });
    }
  }
);

/**
 * Upvote a complaint
 */
router.post(
  '/:complaintId/upvote',
  optionalCitizenAuth,
  [param('complaintId').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { complaintId } = req.params;
      
      // Use citizen ID if logged in, otherwise use hashed IP
      const identifier = req.citizen 
        ? req.citizen._id.toString()
        : crypto.createHash('sha256').update(req.ip || 'anonymous').digest('hex');

      const complaint = await Complaint.findOne({ complaintId });

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found',
        });
      }

      // Check if already upvoted
      const existingUpvote = complaint.upvotes.find(u => 
        (u.oderId && u.oderId.toString() === identifier) ||
        u.phoneHash === identifier
      );

      if (existingUpvote) {
        // Remove upvote (toggle)
        complaint.upvotes = complaint.upvotes.filter(u =>
          !((u.oderId && u.oderId.toString() === identifier) ||
            u.phoneHash === identifier)
        );
        complaint.upvoteCount = Math.max(0, complaint.upvoteCount - 1);
        await complaint.save();

        return res.json({
          success: true,
          message: 'Upvote removed',
          data: {
            upvoted: false,
            upvoteCount: complaint.upvoteCount,
          },
        });
      }

      // Add upvote
      if (req.citizen) {
        complaint.upvotes.push({
          oderId: req.citizen._id,
          createdAt: new Date(),
        });
      } else {
        complaint.upvotes.push({
          phoneHash: identifier,
          createdAt: new Date(),
        });
      }
      
      complaint.upvoteCount = (complaint.upvoteCount || 0) + 1;
      await complaint.save();

      // Notify via WebSocket
      notifyUpvote(complaint);

      res.json({
        success: true,
        message: 'Upvoted successfully',
        data: {
          upvoted: true,
          upvoteCount: complaint.upvoteCount,
        },
      });
    } catch (error) {
      console.error('Upvote error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upvote',
      });
    }
  }
);

/**
 * Get trending complaints (most upvoted in last 7 days)
 */
router.get(
  '/trending/list',
  async (req, res) => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const complaints = await Complaint.find({
        isPublic: { $ne: false },
        createdAt: { $gte: sevenDaysAgo },
        upvoteCount: { $gt: 0 },
      })
        .select('complaintId category status description address.fullAddress upvoteCount createdAt')
        .sort({ upvoteCount: -1 })
        .limit(10);

      res.json({
        success: true,
        data: { complaints },
      });
    } catch (error) {
      console.error('Get trending error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trending',
      });
    }
  }
);

/**
 * Get community statistics
 */
router.get(
  '/stats/summary',
  async (req, res) => {
    try {
      const stats = await Complaint.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            byCategory: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 5 }
            ],
            totalUpvotes: [
              { $group: { _id: null, total: { $sum: '$upvoteCount' } } }
            ],
            recentResolved: [
              { $match: { status: 'resolved' } },
              { $sort: { 'resolution.resolvedAt': -1 } },
              { $limit: 5 },
              { $project: { complaintId: 1, category: 1, 'resolution.resolvedAt': 1 } }
            ],
          },
        },
      ]);

      const result = stats[0];
      
      res.json({
        success: true,
        data: {
          totalComplaints: result.total[0]?.count || 0,
          byStatus: result.byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
          topCategories: result.byCategory,
          totalUpvotes: result.totalUpvotes[0]?.total || 0,
          recentlyResolved: result.recentResolved,
        },
      });
    } catch (error) {
      console.error('Get community stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get stats',
      });
    }
  }
);

module.exports = router;
