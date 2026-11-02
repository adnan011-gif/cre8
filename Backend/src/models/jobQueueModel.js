const mongoose = require('mongoose');

const jobQueueSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true,
    },
    taskType: {
      type: String,
      required: [true, 'Task type is required'],
      enum: ['canvas', 'short', 'clip', 'agent_chat', 'trend_research'],
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'stuck'],
      default: 'queued',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    error: {
      type: String,
      default: '',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index to find active/running jobs quickly
jobQueueSchema.index({ status: 1, createdAt: 1 });

const JobQueue = mongoose.model('JobQueue', jobQueueSchema);

module.exports = JobQueue;
