const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Register user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login user - Step 1: Request OTP
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // Generate OTP
      const otp = emailService.generateOTP();
      
      // Set OTP expiry to 5 minutes from now
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      
      // Save OTP to user
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP via email
      try {
        await emailService.sendOTP(user.email, otp, user.username);
        res.json({
          message: 'OTP sent to your email',
          email: user.email,
          requiresOTP: true,
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        res.status(500).json({ 
          message: 'Failed to send OTP. Please check email configuration.',
          error: emailError.message 
        });
      }
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login user - Step 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP exists
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: 'No OTP requested. Please login again.' });
    }

    // Check if OTP has expired
    if (new Date() > user.otpExpiry) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please login again.' });
    }

    // Verify OTP
    if (user.otp === otp) {
      // Clear OTP after successful verification
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      // Log the login activity
      const activityLog = await ActivityLog.create({
        user: user._id,
        action: 'login',
        description: `${user.username} logged in`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      // Populate and emit to admins
      const populatedLog = await ActivityLog.findById(activityLog._id)
        .populate('user', 'username email role');
      
      if (req.app.get('io')) {
        req.app.get('io').emit('activity-log', populatedLog);
      }

      // Return user data with token
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        allowedBranches: user.allowedBranches || [],
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid OTP' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile (refreshes user data)
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    // Return user data with token (same format as login)
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      allowedBranches: user.allowedBranches || [],
      token: req.headers.authorization.split(' ')[1], // Keep same token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

