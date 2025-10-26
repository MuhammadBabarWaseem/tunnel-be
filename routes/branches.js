const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Branch = require('../models/Branch');
const Log = require('../models/Log');
const { protect, admin } = require('../middleware/auth');

// Get all branches
router.get('/', protect, async (req, res) => {
  try {
    const branches = await Branch.find().populate('createdBy', 'username email');
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single branch
router.get('/:id', protect, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('createdBy', 'username email');
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    res.json(branch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create branch
router.post('/', protect, async (req, res) => {
  try {
    const { name, location, localUrl } = req.body;

    const branchExists = await Branch.findOne({ name });
    if (branchExists) {
      return res.status(400).json({ message: 'Branch with this name already exists' });
    }

    const apiKey = uuidv4();

    const branch = await Branch.create({
      name,
      location,
      localUrl,
      apiKey,
      createdBy: req.user._id,
    });

    const populatedBranch = await Branch.findById(branch._id).populate('createdBy', 'username email');
    res.status(201).json(populatedBranch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update branch
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, location, localUrl } = req.body;
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    branch.name = name || branch.name;
    branch.location = location || branch.location;
    branch.localUrl = localUrl || branch.localUrl;

    const updatedBranch = await branch.save();
    const populatedBranch = await Branch.findById(updatedBranch._id).populate('createdBy', 'username email');
    res.json(populatedBranch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete branch
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    await branch.deleteOne();
    res.json({ message: 'Branch removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get branch logs
router.get('/:id/logs', protect, async (req, res) => {
  try {
    const logs = await Log.find({ branch: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Regenerate API key
router.post('/:id/regenerate-key', protect, admin, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    branch.apiKey = uuidv4();
    const updatedBranch = await branch.save();
    res.json({ apiKey: updatedBranch.apiKey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

