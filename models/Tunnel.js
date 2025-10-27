const mongoose = require('mongoose');

const tunnelSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  port: {
    type: Number,
    required: false,
    unique: false,
  },
  path: {
    type: String,
    required: false,
    unique: true,
  },
  socketId: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  bytesTransferred: {
    type: Number,
    default: 0,
  },
  requestCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Tunnel', tunnelSchema);

