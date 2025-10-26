const express = require('express');
const router = express.Router();
const Tunnel = require('../models/Tunnel');
const { protect } = require('../middleware/auth');

// Get all active tunnels
router.get('/', protect, async (req, res) => {
  try {
    console.log('User requesting tunnels:', {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    });
    
    const tunnels = await Tunnel.find({ active: true }).populate({
      path: 'branch',
      select: 'name location publicUrl',
    });
    
    console.log('Found active tunnels:', tunnels.length);
    
    res.json(tunnels);
  } catch (error) {
    console.error('Error fetching tunnels:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get tunnel by branch
router.get('/branch/:branchId', protect, async (req, res) => {
  try {
    const tunnel = await Tunnel.findOne({
      branch: req.params.branchId,
      active: true,
    }).populate('branch');
    
    if (!tunnel) {
      return res.status(404).json({ message: 'No active tunnel found for this branch' });
    }
    
    res.json(tunnel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

