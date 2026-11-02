const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Usage type is required'],
      enum: ['llm_call', 'image_gen', 'video_gen'],
    },
    provider: {
      type: String,
      required: [true, 'Provider name is required'], // e.g. 'gemini', 'groq', 'ollama', 'imagen'
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // tracks usage times
  }
);

// Index to query usages within a timeframe (e.g. hourly/daily rate tracking)
usageLogSchema.index({ creatorId: 1, type: 1, createdAt: -1 });

const UsageLog = mongoose.model('UsageLog', usageLogSchema);

module.exports = UsageLog;
