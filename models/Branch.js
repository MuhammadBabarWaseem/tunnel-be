const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
  },
  localUrl: {
    type: String,
    required: true,
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
  },
  assignedPort: {
    type: Number,
    default: null,
  },
  publicUrl: {
    type: String,
    default: null,
  },
  lastConnected: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Branch', branchSchema);

