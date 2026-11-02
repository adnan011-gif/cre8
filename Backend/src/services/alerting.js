const Alert = require('../models/alertModel');

/**
 * Dispatch an alert to the database and print to console
 */
exports.dispatchAlert = async ({ type, severity, message, creatorId }) => {
  try {
    // Check if an unresolved identical alert already exists to prevent duplicate spamming
    const existing = await Alert.findOne({
      type,
      message,
      creatorId: creatorId || null,
      resolved: false,
    });

    if (existing) {
      // Just update timestamps
      existing.updatedAt = new Date();
      await existing.save();
      return existing;
    }

    const alert = new Alert({
      type,
      severity,
      message,
      creatorId: creatorId || null,
    });

    await alert.save();
    console.warn(`[Platform Alert - ${severity.toUpperCase()}] type=${type}: ${message}`);
    return alert;
  } catch (error) {
    console.error('❌ Failed to dispatch alert:', error.message);
  }
};
