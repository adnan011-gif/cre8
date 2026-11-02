const mongoose = require('mongoose');

/**
 * Shared Asset Library
 * Every file produced by any hub (Studio, Echo, Store, Agent) is stored here
 * so it can be cross-referenced without regeneration.
 */
const assetSchema = new mongoose.Schema(
  {
    // ── Classification ────────────────────────────────────────────────────────
    type: {
      type: String,
      required: [true, 'Asset type is required'],
      enum: ['image', 'video', 'thumbnail', 'poster', 'ad_creative', 'short', 'clip', 'audio', 'campaign_pack'],
    },
    hub: {
      type: String,
      required: [true, 'Source hub is required'],
      enum: ['studio', 'store', 'agent', 'echo'],
    },

    // ── Ownership ─────────────────────────────────────────────────────────────
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true,
    },

    // ── Optional campaign / pitch link ────────────────────────────────────────
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    // ── Display ───────────────────────────────────────────────────────────────
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: 'Untitled Asset',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },

    // ── Storage ───────────────────────────────────────────────────────────────
    url: {
      type: String,
      default: '',
    },

    // ── Flexible metadata (aspect ratio, duration, file size, model used …) ──
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Searchable tags ───────────────────────────────────────────────────────
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast per-creator queries filtered by hub
assetSchema.index({ creatorId: 1, hub: 1 });
assetSchema.index({ creatorId: 1, type: 1 });

const Asset = mongoose.model('Asset', assetSchema);
module.exports = Asset;
