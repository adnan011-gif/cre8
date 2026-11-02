const mongoose = require('mongoose');

/**
 * AuditLog
 * Append-only record of every agency action (add_creator, remove_creator,
 * update_role, act_as, etc.).  Never mutated after creation.
 */
const auditLogSchema = new mongoose.Schema(
  {
    agencyOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: ['add_creator', 'remove_creator', 'update_role', 'act_as', 'other'],
      required: true,
    },

    // Flexible meta — stores targetCreatorId, newRole, etc.
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Populated from meta.targetCreatorId for convenience in queries
    targetCreatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-populate targetCreatorId from meta before save
auditLogSchema.pre('save', function (next) {
  if (this.meta?.targetCreatorId && !this.targetCreatorId) {
    this.targetCreatorId = this.meta.targetCreatorId;
  }
  next();
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
