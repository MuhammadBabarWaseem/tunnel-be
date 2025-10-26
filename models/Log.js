const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  type: {
    type: String,
    enum: ['connection', 'disconnection', 'request', 'error'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Log', logSchema);

