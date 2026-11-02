const mongoose = require('mongoose');

/**
 * AgencyAccount
 * Links an agency user to the creators they manage.
 * Access is enforced here at the data layer — the UI never grants
 * cross-account reads that aren't reflected in managedCreators.
 */
const agencySchema = new mongoose.Schema(
  {
    agencyName: {
      type: String,
      required: [true, 'Agency name is required'],
      trim: true,
      maxlength: [100, 'Agency name cannot exceed 100 characters'],
    },

    // The user account that owns / administers this agency
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      unique: true,
    },

    // Creators managed by this agency with per-creator role scoping
    managedCreators: [
      {
        creatorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['view', 'act-as'],
          default: 'view',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Instance methods ──────────────────────────────────────────────────────────

/** Returns true if this agency has ANY level of access to creatorId. */
agencySchema.methods.hasAccessTo = function (creatorId) {
  return this.managedCreators.some(
    (mc) => mc.creatorId.toString() === creatorId.toString()
  );
};

/** Returns true if this agency can act-as (impersonate) creatorId. */
agencySchema.methods.canActAs = function (creatorId) {
  const entry = this.managedCreators.find(
    (mc) => mc.creatorId.toString() === creatorId.toString()
  );
  return entry?.role === 'act-as';
};

const AgencyAccount = mongoose.model('AgencyAccount', agencySchema);
module.exports = AgencyAccount;
