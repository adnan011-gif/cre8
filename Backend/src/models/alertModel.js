const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['quota_threshold', 'job_stuck', 'payment_failed', 'circuit_breaker_tripped'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    message: {
      type: String,
      required: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
