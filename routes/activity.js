const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect, admin } = require('../middleware/auth');

// Get all activity logs (admin only)
router.get('/', protect, admin, async (req, res) => {
  try {
    const { limit = 50, action, userId, branchId } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;
    if (branchId) query.branch = branchId;

    const logs = await ActivityLog.find(query)
      .populate('user', 'username email role')
      .populate('branch', 'name location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recent activity (last 24 hours) - admin only
router.get('/recent', protect, admin, async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const logs = await ActivityLog.find({
      createdAt: { $gte: oneDayAgo }
    })
      .populate('user', 'username email role')
      .populate('branch', 'name location')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get activity stats (admin only)
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [dailyStats, weeklyStats, totalByAction] = await Promise.all([
      ActivityLog.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      ActivityLog.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      ActivityLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      daily: dailyStats,
      weekly: weeklyStats,
      byAction: totalByAction.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Log an activity (authenticated users)
router.post('/', protect, async (req, res) => {
  try {
    const { action, description, branchId, metadata } = req.body;

    const log = await ActivityLog.create({
      user: req.user._id,
      action,
      description,
      branch: branchId || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      metadata: metadata || {}
    });

    const populatedLog = await ActivityLog.findById(log._id)
      .populate('user', 'username email role')
      .populate('branch', 'name location');

    // Emit to admins via Socket.IO
    if (req.app.get('io')) {
      req.app.get('io').emit('activity-log', populatedLog);
    }

    res.status(201).json(populatedLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's own activity
router.get('/my-activity', protect, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ user: req.user._id })
      .populate('branch', 'name location')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

